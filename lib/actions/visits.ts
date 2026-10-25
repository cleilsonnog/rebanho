"use server"

import type { z } from "zod"

import { secureAction } from "../action"
import { db } from "../db"
import { assertMembers, toDate, toVisit } from "../data"
import { idSchema, visitSchema } from "../validations"

export async function createVisit(input: z.input<typeof visitSchema>) {
  return secureAction("visitas", visitSchema, input, async ({ membroId, data, proximaVisita, ...v }, { church }) => {
    await assertMembers(church.id, [membroId])
    const row = await db.visit.create({
      data: {
        ...v,
        churchId: church.id,
        memberId: membroId,
        data: toDate(data),
        proximaVisita: proximaVisita ? toDate(proximaVisita) : null,
      },
    })
    return toVisit(row)
  })
}

export async function deleteVisit(id: string) {
  return secureAction("visitas", idSchema, id, async (id, { church }) => {
    await db.visit.delete({ where: { id, churchId: church.id } })
  })
}
