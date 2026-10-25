"use server"

import { z } from "zod"

import { secureAction } from "../action"
import { ActionError, type Session } from "../church"
import { db } from "../db"
import { assertMembers, cellInclude, cellScope, cellMeetingInclude, toCell, toCellMeeting, toDate } from "../data"
import type { CellRole } from "../generated/prisma/client"
import { limitar } from "../rate-limit"
import { cellMeetingSchema, cellSchema, geocodeSchema, idSchema } from "../validations"

type CellData = z.output<typeof cellSchema>

/** Busca a célula dentro do que o usuário pode lançar reunião (o líder de célula, só as dele). */
async function minhaCelula({ church, user }: Session, id: string) {
  const cell = await db.cell.findFirst({ where: { id, churchId: church.id, ...cellScope(user) }, include: cellInclude })
  if (!cell) throw new ActionError("Você só pode alterar a célula que lidera.")
  return cell
}

/** Grava a célula, a liderança e quem frequenta. Líderes, colíderes e anfitriões entram na lista de membros. */
async function saveCell(churchId: string, id: string | undefined, c: CellData) {
  const { endereco, lideres, colideres, anfitrioes, membroIds, diaSemana, ...campos } = c
  const pessoas = [...new Set([...lideres, ...colideres, ...anfitrioes, ...membroIds])]
  await assertMembers(churchId, pessoas)

  const dados = { ...campos, ...endereco, diaSemana: diaSemana ?? null }
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
  return secureAction("celulas", cellSchema, input, (c, { church }) => saveCell(church.id, undefined, c))
}

export async function updateCell(id: string, input: z.input<typeof cellSchema>) {
  return secureAction("celulas", cellSchema.extend({ id: idSchema }), { ...input, id }, ({ id, ...c }, { church }) =>
    saveCell(church.id, id, c)
  )
}

/** Exclui a célula e as reuniões dela; os membros continuam cadastrados, só sem célula. */
export async function deleteCell(id: string) {
  return secureAction("celulas", idSchema, id, async (id, { church }) => {
    await db.cell.delete({ where: { id, churchId: church.id } })
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

const USER_AGENT = "Rebanho/0.1 (+https://github.com/cleilsonnog/rebanho)"

async function getJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(6000) })
    return r.ok ? ((await r.json()) as T) : null
  } catch {
    return null
  }
}

async function nominatim(params: Record<string, string>) {
  const q = new URLSearchParams({ ...params, country: "Brasil", format: "json", limit: "1" })
  const r = await getJSON<{ lat: string; lon: string }[]>(`https://nominatim.openstreetmap.org/search?${q}`)
  return r?.[0] ? { lat: Number(r[0].lat), lng: Number(r[0].lon) } : null
}

/**
 * Acha a posição de um endereço: primeiro pela rua (Nominatim/OpenStreetMap), depois pelo CEP (BrasilAPI)
 * e por último pelo bairro. Os dois serviços são grátis e pedem uso moderado, daí o limite por igreja.
 */
export async function geocodeAddress(input: z.input<typeof geocodeSchema>) {
  return secureAction("celulas", geocodeSchema, input, async (e, { church }) => {
    await limitar("geocodificacao", church.id)
    const cidade = { city: e.cidade, state: e.uf }

    if (e.rua) {
      const p = await nominatim({ street: `${e.numero} ${e.rua}`.trim(), ...cidade })
      if (p) return { ...p, precisao: "endereço" as const }
    }
    if (e.cep) {
      type Cep = { location?: { coordinates?: { latitude?: string; longitude?: string } } }
      const r = await getJSON<Cep>(`https://brasilapi.com.br/api/cep/v2/${e.cep.replace(/\D/g, "")}`)
      const c = r?.location?.coordinates
      if (c?.latitude && c.longitude) return { lat: Number(c.latitude), lng: Number(c.longitude), precisao: "CEP" as const }
    }
    if (e.bairro) {
      const p = await nominatim({ q: `${e.bairro}, ${e.cidade} - ${e.uf}` })
      if (p) return { ...p, precisao: "bairro" as const }
    }
    throw new ActionError("Não encontramos esse endereço. Clique no mapa para marcar a casa.")
  })
}
