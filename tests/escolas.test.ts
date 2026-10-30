import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { deleteSchoolLesson, saveSchool, saveSchoolClass, saveSchoolLesson, setEnrollment } from "@/lib/actions/schools"
import { loadAppData } from "@/lib/data"
import { db } from "@/lib/db"
import type { Church, ChurchUser } from "@/lib/generated/prisma/client"

import { apagarIgrejasDeTeste, criarIgreja, criarUsuario, filialPorNome, logar } from "./helpers"

// Escolas: a secretaria monta escolas e turmas; a presença é lançada por ela e pelo professor,
// cada professor só nas turmas dele (lib/data.ts › turmasDoProfessor), e cada igreja só vê as suas.

const NEGADO = { ok: false, error: "Sua função não permite fazer isso." }
const SO_PROFESSOR = { ok: false, error: "Você só pode lançar aulas das turmas em que é professor." }

let igreja: Church
let outra: Church
let secretaria: ChurchUser
let batismo: { id: string; professor: string; alunos: string[] }
let discipulos: { id: string; professor: string; alunos: string[] }

const aula = (turmaId: string, presentes: string[], data = "2026-10-25") => ({ turmaId, data, tema: "Teste", presentes })

async function turmaDemo(nome: string) {
  const t = await db.schoolClass.findFirstOrThrow({ where: { churchId: igreja.id, nome }, include: { teachers: true, students: true } })
  return { id: t.id, professor: t.teachers[0].memberId, alunos: t.students.map((s) => s.memberId) }
}

beforeAll(async () => {
  await apagarIgrejasDeTeste()
  igreja = await criarIgreja("Escolas")
  outra = await criarIgreja("Escolas outra")
  secretaria = await criarUsuario(igreja.id, "secretaria")
  batismo = await turmaDemo("Outubro/2026")
  discipulos = await turmaDemo("Turma 2026")
})

afterAll(apagarIgrejasDeTeste)

describe("secretaria", () => {
  beforeAll(() => logar(secretaria))

  it("cria escola e turma, muda a situação do aluno e lança aula", async () => {
    const escola = await saveSchool(undefined, { nome: "Escola de Líderes", descricao: "" })
    if (!escola.ok) throw new Error(escola.error)
    const [prof, a1, a2] = batismo.alunos
    const turma = await saveSchoolClass(undefined, { escolaId: escola.data.id, nome: "T1", horario: "", local: "", professores: [prof], alunos: [a1, a2] })
    if (!turma.ok) throw new Error(turma.error)
    expect(turma.data.alunos.map((a) => a.situacao)).toEqual(["cursando", "cursando"])

    const concluiu = await setEnrollment({ turmaId: turma.data.id, membroId: a1, situacao: "concluido" })
    expect(concluiu.ok && concluiu.data.alunos.find((a) => a.id === a1)).toMatchObject({ situacao: "concluido", concluidoEm: expect.any(String) })

    expect((await saveSchoolLesson(aula(turma.data.id, [a1, a2]))).ok).toBe(true)
    expect(await db.auditLog.count({ where: { churchId: igreja.id, area: "escolas" } })).toBe(3)
  })

  it("quem sai da turma perde a presença registrada", async () => {
    const turma = await db.schoolClass.findFirstOrThrow({ where: { churchId: igreja.id, nome: "T1" }, include: { students: true, teachers: true } })
    // Fica quem concluiu no teste anterior (a ordem do banco não é garantida).
    const fica = turma.students.find((s) => s.situacao === "concluido")!.memberId
    const sai = turma.students.find((s) => s.memberId !== fica)!.memberId
    const r = await saveSchoolClass(turma.id, {
      escolaId: turma.schoolId,
      nome: "T1",
      horario: "",
      local: "",
      professores: turma.teachers.map((t) => t.memberId),
      alunos: [fica],
    })
    expect(r.ok && r.data.alunos.map((a) => a.id)).toEqual([fica])
    // Quem fica mantém a situação de antes.
    expect(r.ok && r.data.alunos[0].situacao).toBe("concluido")
    expect(await db.schoolAttendance.count({ where: { memberId: sai, lesson: { classId: turma.id } } })).toBe(0)
  })

  it("não marca presença de quem não é aluno", async () => {
    expect(await saveSchoolLesson(aula(batismo.id, [discipulos.alunos[0]]))).toEqual({
      ok: false,
      error: "Há presença marcada para quem não é aluno da turma.",
    })
  })

  it("de uma filial, não monta escola (vale para a igreja toda)", async () => {
    const leste = await filialPorNome(igreja.id, "Congregação Leste")
    await logar(await criarUsuario(igreja.id, "secretaria", { congregationId: leste.id }))
    expect(await saveSchool(undefined, { nome: "Escola da filial", descricao: "" })).toEqual({
      ok: false,
      error: "As escolas valem para a igreja toda e são organizadas pela sede.",
    })
    await logar(secretaria)
  })
})

describe("professor", () => {
  let professor: ChurchUser

  beforeAll(async () => {
    // Um líder de célula que também ensina na Escola de Batismo.
    professor = await criarUsuario(igreja.id, "lider", { memberId: batismo.professor })
    await logar(professor)
  })

  it("lança e exclui aula só da turma dele", async () => {
    const r = await saveSchoolLesson(aula(batismo.id, batismo.alunos.slice(0, 2)))
    expect(r.ok).toBe(true)
    expect(await saveSchoolLesson(aula(discipulos.id, []))).toEqual(SO_PROFESSOR)
    if (r.ok) expect((await deleteSchoolLesson(r.data.id)).ok).toBe(true)
  })

  it("não monta turma nem muda a situação dos alunos", async () => {
    expect(await saveSchool(undefined, { nome: "X", descricao: "" })).toEqual(NEGADO)
    expect(await setEnrollment({ turmaId: batismo.id, membroId: batismo.alunos[0], situacao: "concluido" })).toEqual(NEGADO)
  })

  it("recebe só as turmas, escolas e aulas dele", async () => {
    const d = await loadAppData({ church: igreja, user: professor })
    const ids = new Set(d.schoolClasses.map((t) => t.id))
    expect(ids.has(batismo.id)).toBe(true)
    expect(ids.has(discipulos.id)).toBe(false)
    expect(d.schools.map((s) => s.nome)).toEqual(["Escola de Batismo"])
    expect(d.schoolLessons.every((a) => ids.has(a.turmaId))).toBe(true)
  })
})

describe("pastor e demais funções", () => {
  it("o pastor vê todas as turmas, mas só lança aula se for professor", async () => {
    const pastor = await criarUsuario(igreja.id, "pastor")
    const d = await loadAppData({ church: igreja, user: pastor })
    expect(d.schoolClasses.length).toBeGreaterThanOrEqual(3)
    await logar(pastor)
    expect(await saveSchoolLesson(aula(batismo.id, []))).toEqual(SO_PROFESSOR)
    expect(await saveSchool(undefined, { nome: "X", descricao: "" })).toEqual(NEGADO)
  })

  it("tesouraria e líder que não ensinam não recebem nenhuma turma", async () => {
    for (const papel of ["tesouraria", "lider"] as const) {
      const d = await loadAppData({ church: igreja, user: await criarUsuario(igreja.id, papel) })
      expect(d.schoolClasses).toEqual([])
      expect(d.schools).toEqual([])
    }
  })
})

describe("isolamento entre igrejas", () => {
  it("a secretaria de outra igreja não vê nem altera as turmas desta", async () => {
    const intrusa = await criarUsuario(outra.id, "secretaria")
    const d = await loadAppData({ church: outra, user: intrusa })
    expect(d.schoolClasses.some((t) => t.id === batismo.id)).toBe(false)

    await logar(intrusa)
    expect((await saveSchoolLesson(aula(batismo.id, []))).ok).toBe(false)
    expect((await setEnrollment({ turmaId: batismo.id, membroId: batismo.alunos[0], situacao: "desistiu" })).ok).toBe(false)
    const minhaEscola = await db.school.findFirstOrThrow({ where: { churchId: outra.id } })
    // Turma na escola dela, mas com alunos desta igreja: recusado.
    expect((await saveSchoolClass(undefined, { escolaId: minhaEscola.id, nome: "Roubo", horario: "", local: "", professores: [batismo.professor], alunos: [] })).ok).toBe(false)
    expect(await db.schoolEnrollment.findFirst({ where: { classId: batismo.id, situacao: "desistiu" } })).toBeNull()
  })
})
