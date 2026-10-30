"use server"

import type { z } from "zod"

import { secureAction } from "../action"
import { db } from "../db"
import { assertMembers, toDate, toTransaction } from "../data"
import { formatBRL } from "../format"
import { idSchema, transactionSchema } from "../validations"

const TIPO = { entrada: "entrada", saida: "saída" }

export async function createTransaction(input: z.input<typeof transactionSchema>) {
  return secureAction("financeiro", transactionSchema, input, async ({ membroId, data, ...t }, { church }, registrar) => {
    // Só entradas têm dizimista/ofertante.
    const memberId = t.tipo === "entrada" ? membroId : undefined
    if (memberId) await assertMembers(church.id, [memberId])
    const row = await db.transaction.create({ data: { ...t, churchId: church.id, memberId, data: toDate(data) } })
    registrar(`Lançou ${TIPO[row.tipo]} de ${formatBRL(Number(row.valor))} (${row.categoria})`)
    return toTransaction(row)
  })
}

export async function deleteTransaction(id: string) {
  return secureAction("financeiro", idSchema, id, async (id, { church }, registrar) => {
    const row = await db.transaction.delete({ where: { id, churchId: church.id } })
    registrar(`Excluiu ${TIPO[row.tipo]} de ${formatBRL(Number(row.valor))} (${row.categoria})`)
  })
}
