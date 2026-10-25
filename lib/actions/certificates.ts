"use server"

import type { z } from "zod"

import { secureAction } from "../action"
import { db } from "../db"
import { assertMembers, toCertificate, toDate } from "../data"
import { certificatesSchema } from "../validations"

export async function issueCertificates(input: z.input<typeof certificatesSchema>) {
  return secureAction("certificados", certificatesSchema, input, async ({ membroIds, emitidoEm, ...c }, { church }) => {
    await assertMembers(church.id, membroIds)
    const rows = await db.certificate.createManyAndReturn({
      data: membroIds.map((memberId) => ({ ...c, churchId: church.id, memberId, emitidoEm: toDate(emitidoEm) })),
    })
    return rows.map(toCertificate)
  })
}
