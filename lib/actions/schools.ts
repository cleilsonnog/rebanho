"use server"

import { z } from "zod"

import { secureAction } from "../action"
import { ActionError, type Session } from "../church"
import { db } from "../db"
import {
  assertMembers,
  filialDe,
  schoolClassInclude,
  schoolLessonInclude,
  toDate,
  toSchool,
  toSchoolClass,
  toSchoolLesson,
  turmasDoProfessor,
} from "../data"
import { SITUACAO_ALUNO_LABEL, formatDate } from "../format"
import { enrollmentSchema, idSchema, schoolClassSchema, schoolLessonSchema, schoolSchema } from "../validations"

// Escolas e turmas são montadas pela secretaria (área "escolas"); a presença das aulas é lançada por ela
// e pelos professores, cada um só nas turmas que ensina (área "aulas" + turmasDoProfessor).

/** As escolas valem para a igreja toda, como o estudo da semana: quem é de uma filial não monta escola nem turma. */
function daSede({ user }: Session) {
  if (filialDe(user)) throw new ActionError("As escolas valem para a igreja toda e são organizadas pela sede.")
}

async function turma({ church, user }: Session, id: string, scope = turmasDoProfessor(user)) {
  const t = await db.schoolClass.findFirst({ where: { id, churchId: church.id, ...scope }, include: { ...schoolClassInclude, school: true } })
  if (!t) throw new ActionError("Você só pode lançar aulas das turmas em que é professor.")
  return t
}

export async function saveSchool(id: string | undefined, input: z.input<typeof schoolSchema>) {
  const schema = schoolSchema.extend({ id: idSchema.optional() })
  return secureAction("escolas", schema, { ...input, id }, async ({ id, ...e }, session, registrar) => {
    daSede(session)
    const churchId = session.church.id
    const row = id ? await db.school.update({ where: { id, churchId }, data: e }) : await db.school.create({ data: { ...e, churchId } })
    registrar(`${id ? "Editou" : "Criou"} a escola ${row.nome}`)
    return toSchool(row)
  })
}

/** Exclui a escola com as turmas e aulas dela. Os certificados já emitidos continuam. */
export async function deleteSchool(id: string) {
  return secureAction("escolas", idSchema, id, async (id, session, registrar) => {
    daSede(session)
    const row = await db.school.delete({ where: { id, churchId: session.church.id } })
    registrar(`Excluiu a escola ${row.nome}`)
  })
}

/** Grava a turma, os professores e os alunos. Quem continua na turma mantém a situação; quem sai perde a presença. */
export async function saveSchoolClass(id: string | undefined, input: z.input<typeof schoolClassSchema>) {
  const schema = schoolClassSchema.extend({ id: idSchema.optional() })
  return secureAction("escolas", schema, { ...input, id }, async ({ id, escolaId, professores, alunos, inicio, ...t }, session, registrar) => {
    daSede(session)
    const churchId = session.church.id
    const escola = await db.school.findFirst({ where: { id: escolaId, churchId } })
    if (!escola) throw new ActionError("Escola não encontrada.")
    await assertMembers(churchId, [...professores, ...alunos])

    const dados = { ...t, schoolId: escola.id, inicio: inicio ? toDate(inicio) : null }
    const row = await db.$transaction(async (tx) => {
      const c = id
        ? await tx.schoolClass.update({ where: { id, churchId }, data: dados })
        : await tx.schoolClass.create({ data: { ...dados, churchId } })
      await tx.schoolTeacher.deleteMany({ where: { classId: c.id } })
      await tx.schoolTeacher.createMany({ data: professores.map((memberId) => ({ classId: c.id, memberId })) })
      await tx.schoolEnrollment.deleteMany({ where: { classId: c.id, memberId: { notIn: alunos } } })
      await tx.schoolAttendance.deleteMany({ where: { lesson: { classId: c.id }, memberId: { notIn: alunos } } })
      await tx.schoolEnrollment.createMany({ data: alunos.map((memberId) => ({ classId: c.id, memberId })), skipDuplicates: true })
      return tx.schoolClass.findUniqueOrThrow({ where: { id: c.id }, include: schoolClassInclude })
    })
    registrar(`${id ? "Editou" : "Criou"} a turma ${row.nome} (${escola.nome})`)
    return toSchoolClass(row)
  })
}

export async function deleteSchoolClass(id: string) {
  return secureAction("escolas", idSchema, id, async (id, session, registrar) => {
    daSede(session)
    const row = await db.schoolClass.delete({ where: { id, churchId: session.church.id }, include: { school: true } })
    registrar(`Excluiu a turma ${row.nome} (${row.school.nome})`)
  })
}

/** Muda a situação do aluno (cursando, concluiu, desistiu). Quem concluiu ganha a data de conclusão. */
export async function setEnrollment(input: z.input<typeof enrollmentSchema>) {
  return secureAction("escolas", enrollmentSchema, input, async ({ turmaId, membroId, situacao, concluidoEm }, session, registrar) => {
    daSede(session)
    const t = await turma(session, turmaId, {})
    const aluno = t.students.find((s) => s.member.id === membroId)
    if (!aluno) throw new ActionError("Essa pessoa não é aluna desta turma.")
    const data = situacao === "concluido" ? toDate(concluidoEm ?? new Date().toISOString().slice(0, 10)) : null
    await db.schoolEnrollment.update({
      where: { classId_memberId: { classId: t.id, memberId: membroId } },
      data: { situacao, concluidoEm: data },
    })
    registrar(`Marcou ${aluno.member.nome} como "${SITUACAO_ALUNO_LABEL[situacao]}" na turma ${t.nome} (${t.school.nome})`)
    return toSchoolClass(await db.schoolClass.findUniqueOrThrow({ where: { id: t.id }, include: schoolClassInclude }))
  })
}

/** Lança (ou corrige) a aula da turma naquele dia, com a presença. */
export async function saveSchoolLesson(input: z.input<typeof schoolLessonSchema>) {
  return secureAction("aulas", schoolLessonSchema, input, async ({ turmaId, data, tema, presentes }, session, registrar) => {
    const t = await turma(session, turmaId)
    const alunos = new Set(t.students.map((s) => s.member.id))
    if (presentes.some((p) => !alunos.has(p))) throw new ActionError("Há presença marcada para quem não é aluno da turma.")

    const dia = toDate(data)
    const row = await db.$transaction(async (tx) => {
      const aula = await tx.schoolLesson.upsert({
        where: { classId_data: { classId: t.id, data: dia } },
        create: { churchId: session.church.id, classId: t.id, data: dia, tema },
        update: { tema },
      })
      await tx.schoolAttendance.deleteMany({ where: { lessonId: aula.id } })
      await tx.schoolAttendance.createMany({ data: presentes.map((memberId) => ({ lessonId: aula.id, memberId })) })
      return tx.schoolLesson.findUniqueOrThrow({ where: { id: aula.id }, include: schoolLessonInclude })
    })
    registrar(`Lançou a aula de ${formatDate(data)} da turma ${t.nome} (${t.school.nome})`)
    return toSchoolLesson(row)
  })
}

export async function deleteSchoolLesson(id: string) {
  return secureAction("aulas", idSchema, id, async (id, { church, user }, registrar) => {
    const row = await db.schoolLesson.delete({
      where: { id, churchId: church.id, class: turmasDoProfessor(user) },
      include: { class: { include: { school: true } } },
    })
    registrar(`Excluiu a aula de ${row.data.toLocaleDateString("pt-BR", { timeZone: "UTC" })} da turma ${row.class.nome} (${row.class.school.nome})`)
  })
}
