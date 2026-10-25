"use server"

import { z } from "zod"

import { secureAction } from "../action"
import { ActionError } from "../church"
import { db } from "../db"
import { memberInclude, toDate, toMember } from "../data"
import { idSchema, importMembersSchema, memberSchema, type MemberInput } from "../validations"

type MemberData = z.output<typeof memberSchema>

async function congregacoes(churchId: string) {
  const cs = await db.congregation.findMany({ where: { churchId }, select: { id: true, nome: true } })
  return new Map(cs.map((c) => [c.nome.toLowerCase(), c]))
}

function congregationId(mapa: Awaited<ReturnType<typeof congregacoes>>, nome: string) {
  if (!nome) return null
  const c = mapa.get(nome.toLowerCase())
  if (!c) throw new ActionError(`A congregação "${nome}" não existe nesta igreja.`)
  return c.id
}

function toRow({ endereco, congregacao: _c, nascimento, dataBatismo, membroDesde, observacoes, ...m }: MemberData) {
  return {
    ...m,
    ...endereco,
    nascimento: toDate(nascimento),
    dataBatismo: m.batizado && dataBatismo ? toDate(dataBatismo) : null,
    membroDesde: toDate(membroDesde),
    observacoes: observacoes ?? null,
  }
}

export async function createMember(input: MemberInput) {
  return secureAction("membros", memberSchema, input, async (m, { church }) => {
    const congs = await congregacoes(church.id)
    const row = await db.member.create({
      data: { ...toRow(m), churchId: church.id, congregationId: congregationId(congs, m.congregacao) },
      include: memberInclude,
    })
    return toMember(row)
  })
}

export async function updateMember(id: string, input: MemberInput) {
  const schema = z.object({ id: idSchema, member: memberSchema })
  return secureAction("membros", schema, { id, member: input }, async ({ id, member: m }, { church }) => {
    const congs = await congregacoes(church.id)
    const row = await db.member.update({
      where: { id, churchId: church.id },
      data: { ...toRow(m), congregationId: congregationId(congs, m.congregacao) },
      include: memberInclude,
    })
    return toMember(row)
  })
}

export async function deleteMember(id: string) {
  return secureAction("membros", idSchema, id, async (id, { church }) => {
    await db.member.delete({ where: { id, churchId: church.id } })
  })
}

export async function importMembers(input: MemberInput[]) {
  return secureAction("membros", importMembersSchema, input, async (ms, { church }) => {
    const congs = await congregacoes(church.id)
    const nomes = new Map([...congs.values()].map((c) => [c.id, c.nome]))
    const rows = await db.member.createManyAndReturn({
      data: ms.map((m) => ({ ...toRow(m), churchId: church.id, congregationId: congregationId(congs, m.congregacao) })),
    })
    return rows.map((r) => toMember({ ...r, congregation: r.congregationId ? { nome: nomes.get(r.congregationId)! } : null }))
  })
}
