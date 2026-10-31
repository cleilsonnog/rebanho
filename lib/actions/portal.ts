"use server"

import { z } from "zod"

import { secureAction } from "../action"
import { ActionError } from "../church"
import { db } from "../db"
import { membrosScope } from "../data"
import { portalAccessSchema } from "../validations"

// A secretaria libera o portal do membro pessoa por pessoa (ou todas com e-mail de uma vez). O login é pelo
// e-mail do cadastro, então sem e-mail não há acesso. Cortar vale na hora: o portal confere a cada página.

export async function setPortalAccess(input: z.input<typeof portalAccessSchema>) {
  return secureAction("membros", portalAccessSchema, input, async ({ membroId, portal }, { church, user }, registrar) => {
    const m = await db.member.findFirst({ where: { id: membroId, churchId: church.id, ...membrosScope(user) } })
    if (!m) throw new ActionError("Pessoa não encontrada nesta igreja.")
    if (portal && !m.email) throw new ActionError("Cadastre o e-mail da pessoa antes de liberar o portal: o login é por ele.")
    await db.member.update({ where: { id: m.id }, data: { portal } })
    registrar(`${portal ? "Liberou" : "Cortou"} o portal do membro para ${m.nome}`)
    return portal
  })
}

/** Libera o portal para todos os membros com e-mail (ativos ou afastados) que ainda não têm. Devolve os ids. */
export async function enablePortalForAll() {
  return secureAction("membros", z.undefined(), undefined, async (_, { church, user }, registrar) => {
    const where = { churchId: church.id, ...membrosScope(user), portal: false, email: { not: "" }, status: { in: ["ativo" as const, "afastado" as const] } }
    const alvo = await db.member.findMany({ where, select: { id: true } })
    await db.member.updateMany({ where: { id: { in: alvo.map((m) => m.id) } }, data: { portal: true } })
    if (alvo.length) registrar(`Liberou o portal do membro para ${alvo.length} pessoas com e-mail`)
    return alvo.map((m) => m.id)
  })
}
