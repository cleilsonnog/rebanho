"use server"

import type { z } from "zod"

import { secureAction } from "../action"
import { db } from "../db"
import { assertMembers, toDate, toTransaction } from "../data"
import { idSchema, transactionSchema } from "../validations"

export async function createTransaction(input: z.input<typeof transactionSchema>) {
  return secureAction("financeiro", transactionSchema, input, async ({ membroId, data, ...t }, { church }) => {
    // Só entradas têm dizimista/ofertante.
    const memberId = t.tipo === "entrada" ? membroId : undefined
    if (memberId) await assertMembers(church.id, [memberId])
    const row = await db.transaction.create({ data: { ...t, churchId: church.id, memberId, data: toDate(data) } })
    return toTransaction(row)
  })
}

export async function deleteTransaction(id: string) {
  return secureAction("financeiro", idSchema, id, async (id, { church }) => {
    await db.transaction.delete({ where: { id, churchId: church.id } })
  })
}
