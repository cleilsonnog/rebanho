"use server"

import { z } from "zod"

import { secureAction } from "../action"
import { ActionError } from "../church"
import { db } from "../db"
import { memberInclude, membrosScope, toMember } from "../data"
import { posicaoDoMembro } from "../geocode"
import type { Endereco } from "../types"
import { portalAccessSchema, portalSettingsSchema, resolveCorrectionSchema } from "../validations"

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

/** Aprova (os dados vão para o cadastro) ou recusa a correção pedida pelo membro no portal. */
export async function resolveCorrection(input: z.input<typeof resolveCorrectionSchema>) {
  return secureAction("membros", resolveCorrectionSchema, input, async ({ id, aprovar }, { church, user }, registrar) => {
    const c = await db.memberCorrection.findFirst({
      where: { id, churchId: church.id, status: "pendente", member: membrosScope(user) },
      include: { member: true },
    })
    if (!c) throw new ActionError("Esse pedido já foi resolvido ou não existe.")
    const m = c.member
    const endereco = c.endereco as Endereco | null
    const novos = {
      ...(c.telefone !== null && { telefone: c.telefone }),
      ...(c.email !== null && { email: c.email }),
      ...(endereco && { ...endereco, ...(await posicaoDoMembro(endereco, m)) }),
    }
    const [membro] = await db.$transaction([
      db.member.update({ where: { id: m.id }, data: aprovar ? novos : {}, include: memberInclude }),
      db.memberCorrection.update({ where: { id: c.id }, data: { status: aprovar ? "aprovado" : "recusado", resolvidoEm: new Date(), resolvidoPor: user.nome } }),
    ])
    registrar(`${aprovar ? "Aprovou" : "Recusou"} a correção de cadastro pedida por ${m.nome}`)
    return toMember(membro)
  })
}

/** O que o portal mostra além da própria pessoa: aniversariantes do mês e colegas de célula (só nomes). */
export async function updatePortalSettings(input: z.input<typeof portalSettingsSchema>) {
  return secureAction("configuracoes", portalSettingsSchema, input, async ({ aniversariantes, colegasCelula }, { church }, registrar) => {
    await db.church.update({ where: { id: church.id }, data: { portalAniversariantes: aniversariantes, portalColegasCelula: colegasCelula } })
    registrar(`Mudou o que o portal do membro mostra (aniversariantes: ${aniversariantes ? "sim" : "não"}, colegas de célula: ${colegasCelula ? "sim" : "não"})`)
    return { aniversariantes, colegasCelula }
  })
}
