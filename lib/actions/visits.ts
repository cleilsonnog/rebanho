"use server"

import type { z } from "zod"

import { secureAction } from "../action"
import { db } from "../db"
import { assertMembers, membrosScope, toDate, toVisit } from "../data"
import { idSchema, visitSchema } from "../validations"

export async function createVisit(input: z.input<typeof visitSchema>) {
  return secureAction("visitas", visitSchema, input, async ({ membroId, data, proximaVisita, ...v }, { church, user }, registrar) => {
    await assertMembers(church.id, [membroId], membrosScope(user))
    const row = await db.visit.create({
      data: {
        ...v,
        churchId: church.id,
        memberId: membroId,
        data: toDate(data),
        proximaVisita: proximaVisita ? toDate(proximaVisita) : null,
      },
      include: { member: { select: { nome: true } } },
    })
    registrar(`Registrou visita a ${row.member.nome}`)
    return toVisit(row)
  })
}

export async function deleteVisit(id: string) {
  return secureAction("visitas", idSchema, id, async (id, { church, user }, registrar) => {
    const row = await db.visit.delete({
      where: { id, churchId: church.id, member: membrosScope(user) },
      include: { member: { select: { nome: true } } },
    })
    registrar(`Excluiu a visita a ${row.member.nome}`)
  })
}
