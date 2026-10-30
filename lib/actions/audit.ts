"use server"

import { z } from "zod"

import { secureAction } from "../action"
import { db } from "../db"
import { idSchema } from "../validations"

const POR_PAGINA = 50

const filtroSchema = z.object({
  /** Último registro já mostrado; a próxima página começa depois dele. */
  depoisDe: idSchema.optional(),
  /** Área da permissão; "admin" = ações só do admin (área vazia). */
  area: z.string().max(30).optional(),
})

/** Histórico de alterações da igreja, do mais recente para o mais antigo. Só o admin vê. */
export async function listarHistorico(input: z.input<typeof filtroSchema> = {}) {
  return secureAction(null, filtroSchema, input, async ({ depoisDe, area }, { church }) => {
    const rows = await db.auditLog.findMany({
      where: { churchId: church.id, ...(area && { area: area === "admin" ? null : area }) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: POR_PAGINA + 1,
      ...(depoisDe && { cursor: { id: depoisDe }, skip: 1 }),
    })
    return {
      itens: rows.slice(0, POR_PAGINA).map((r) => ({
        id: r.id,
        quando: r.createdAt.toISOString(),
        quem: r.userNome,
        papel: r.papel,
        area: r.area,
        descricao: r.descricao,
      })),
      temMais: rows.length > POR_PAGINA,
    }
  })
}
