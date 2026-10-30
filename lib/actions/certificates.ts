"use server"

import type { z } from "zod"

import { secureAction } from "../action"
import { db } from "../db"
import { assertMembers, membrosScope, toCertificate, toDate } from "../data"
import { certificatesSchema } from "../validations"

export async function issueCertificates(input: z.input<typeof certificatesSchema>) {
  return secureAction("certificados", certificatesSchema, input, async ({ membroIds, emitidoEm, ...c }, { church, user }, registrar) => {
    await assertMembers(church.id, membroIds, membrosScope(user))
    const rows = await db.certificate.createManyAndReturn({
      data: membroIds.map((memberId) => ({ ...c, churchId: church.id, memberId, emitidoEm: toDate(emitidoEm) })),
    })
    registrar(rows.length === 1 ? `Emitiu 1 certificado de ${c.tipo}` : `Emitiu ${rows.length} certificados de ${c.tipo}`)
    return rows.map(toCertificate)
  })
}
