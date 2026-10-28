"use server"

import { z } from "zod"

import { secureAction } from "../action"
import { ActionError, type Session } from "../church"
import { db } from "../db"
import {
  assertMembers,
  cellInclude,
  cellMeetingInclude,
  cellScope,
  filialDe,
  loadFiliais,
  membrosScope,
  toCell,
  toCellMeeting,
  toCellStudy,
  toDate,
} from "../data"
import { inicioDaSemana } from "../format"
import type { CellRole } from "../generated/prisma/client"
import { geocodeEndereco } from "../geocode"
import { limitar } from "../rate-limit"
import { cellMeetingSchema, cellSchema, cellStudySchema, geocodeSchema, idSchema } from "../validations"

type CellData = z.output<typeof cellSchema>

/** Busca a célula dentro do que o usuário pode lançar reunião (o líder de célula, só as dele). */
async function minhaCelula({ church, user }: Session, id: string) {
  const cell = await db.cell.findFirst({ where: { id, churchId: church.id, ...cellScope(user) }, include: cellInclude })
  if (!cell) throw new ActionError("Você só pode alterar as células que estão sob a sua responsabilidade.")
  return cell
}

/** Filial da célula pelo nome; vazio = a filial do usuário, ou a sede. Quem é de uma filial só grava células nela. */
async function filialDaCelula({ church, user }: Session, nome: string) {
  const filiais = await loadFiliais(church)
  const minha = filialDe(user)
  const escolhida = nome ? filiais.find((f) => f.nome === nome) : filiais.find((f) => f.id === minha) ?? filiais[0]
  if (!escolhida) throw new ActionError(`A filial "${nome}" não existe.`)
  if (minha && escolhida.id !== minha) throw new ActionError("Você só pode cadastrar células na sua filial.")
  return escolhida.id
}

/** Grava a célula, a liderança e quem frequenta. Líderes, colíderes e anfitriões entram na lista de membros. */
async function saveCell(session: Session, id: string | undefined, c: CellData) {
  const churchId = session.church.id
  const { endereco, lideres, colideres, anfitrioes, membroIds, diaSemana, congregacao, ...campos } = c
  const pessoas = [...new Set([...lideres, ...colideres, ...anfitrioes, ...membroIds])]
  // Quem é de uma filial só põe na célula pessoas da filial.
  await assertMembers(churchId, pessoas, membrosScope(session.user))

  const dados = { ...campos, ...endereco, diaSemana: diaSemana ?? null, congregationId: await filialDaCelula(session, congregacao) }
  const lideranca = (cellId: string) =>
    (
      [
        ["lider", lideres],
        ["colider", colideres],
        ["anfitriao", anfitrioes],
      ] as [CellRole, string[]][]
    ).flatMap(([funcao, ids]) => ids.map((memberId) => ({ cellId, memberId, funcao })))

  return db.$transaction(async (tx) => {
    const cell = id
      ? await tx.cell.update({ where: { id, churchId }, data: dados })
      : await tx.cell.create({ data: { ...dados, churchId } })
    await tx.cellLeader.deleteMany({ where: { cellId: cell.id } })
    await tx.cellLeader.createMany({ data: lideranca(cell.id) })
    // Cada pessoa frequenta uma célula: entrar nesta tira da anterior.
    await tx.member.updateMany({ where: { churchId, cellId: cell.id, id: { notIn: pessoas } }, data: { cellId: null } })
    await tx.member.updateMany({ where: { churchId, id: { in: pessoas } }, data: { cellId: cell.id } })
    return toCell(await tx.cell.findUniqueOrThrow({ where: { id: cell.id }, include: cellInclude }))
  })
}

export async function createCell(input: z.input<typeof cellSchema>) {
  return secureAction("celulas", cellSchema, input, (c, session) => saveCell(session, undefined, c))
}

export async function updateCell(id: string, input: z.input<typeof cellSchema>) {
  return secureAction("celulas", cellSchema.extend({ id: idSchema }), { ...input, id }, async ({ id, ...c }, session) => {
    await minhaCelula(session, id)
    return saveCell(session, id, c)
  })
}

/** Exclui a célula e as reuniões dela; os membros continuam cadastrados, só sem célula. */
export async function deleteCell(id: string) {
  return secureAction("celulas", idSchema, id, async (id, session) => {
    await minhaCelula(session, id)
    await db.cell.delete({ where: { id, churchId: session.church.id } })
  })
}

/** Lança (ou corrige) a reunião da célula naquele dia. */
export async function saveCellMeeting(input: z.input<typeof cellMeetingSchema>) {
  return secureAction("reunioes", cellMeetingSchema, input, async (m, session) => {
    const { church } = session
    const cell = await minhaCelula(session, m.celulaId)
    const daCelula = new Set([...cell.members.map((x) => x.id), ...cell.leaders.map((l) => l.memberId)])
    if (m.presentes.some((p) => !daCelula.has(p))) throw new ActionError("Há presença marcada para quem não é da célula.")

    const data = toDate(m.data)
    const row = await db.$transaction(async (tx) => {
      const meeting = await tx.cellMeeting.upsert({
        where: { cellId_data: { cellId: cell.id, data } },
        create: { churchId: church.id, cellId: cell.id, data, observacoes: m.observacoes },
        update: { observacoes: m.observacoes },
      })
      await tx.cellAttendance.deleteMany({ where: { meetingId: meeting.id } })
      await tx.cellAttendance.createMany({ data: m.presentes.map((memberId) => ({ meetingId: meeting.id, memberId })) })
      await tx.cellVisitor.deleteMany({ where: { meetingId: meeting.id } })
      await tx.cellVisitor.createMany({ data: m.visitantes.map((v) => ({ ...v, meetingId: meeting.id })) })
      return tx.cellMeeting.findUniqueOrThrow({ where: { id: meeting.id }, include: cellMeetingInclude })
    })
    return toCellMeeting(row)
  })
}

export async function deleteCellMeeting(id: string) {
  return secureAction("reunioes", idSchema, id, async (id, { church, user }) => {
    await db.cellMeeting.delete({ where: { id, churchId: church.id, cell: cellScope(user) } })
  })
}

/** Publica (ou corrige) o estudo da semana, que vale para todas as células. */
export async function saveCellStudy(input: z.input<typeof cellStudySchema>) {
  return secureAction("estudos", cellStudySchema, input, async ({ semana, ...e }, { church, user }) => {
    if (filialDe(user)) throw new ActionError("O estudo da semana vale para a igreja toda e é publicado pela sede.")
    const inicio = toDate(inicioDaSemana(semana))
    const row = await db.cellStudy.upsert({
      where: { churchId_semana: { churchId: church.id, semana: inicio } },
      create: { ...e, churchId: church.id, semana: inicio },
      update: e,
    })
    return toCellStudy(row)
  })
}

export async function deleteCellStudy(id: string) {
  return secureAction("estudos", idSchema, id, async (id, { church, user }) => {
    if (filialDe(user)) throw new ActionError("O estudo da semana vale para a igreja toda e é publicado pela sede.")
    await db.cellStudy.delete({ where: { id, churchId: church.id } })
  })
}

/**
 * Acha a posição da casa da célula pelo endereço (lib/geocode.ts). Os serviços são grátis
 * e pedem uso moderado, daí o limite por igreja.
 */
export async function geocodeAddress(input: z.input<typeof geocodeSchema>) {
  return secureAction("celulas", geocodeSchema, input, async (e, { church }) => {
    await limitar("geocodificacao", church.id)
    const p = await geocodeEndereco(e)
    if (!p) throw new ActionError("Não encontramos esse endereço. Clique no mapa para marcar a casa.")
    return p
  })
}
