import "server-only"

import { cache } from "react"
import { cookies } from "next/headers"
import { auth } from "@clerk/nextjs/server"

import { db } from "./db"
import { Prisma } from "./generated/prisma/client"
import { contaLogada } from "./login"

// A igreja e a equipe ficam só no banco (desde 01/11/2026): o Clerk faz apenas o login. Antes, cada igreja era
// uma organização do Clerk, que limita as pessoas por organização (20) e o número de organizações (100).
// Quem é da equipe de qual igreja, e com que função, está em ChurchUser; a igreja aberta fica num cookie.

/** Erro com mensagem que pode ser mostrada ao usuário. */
export class ActionError extends Error {}

/** Logado, mas sem igreja definida (nenhuma ainda, ou mais de uma sem escolha): a tela leva para /igreja. */
export class SemIgreja extends ActionError {
  constructor() {
    super("Escolha a igreja para continuar.")
  }
}

/** Cookie com a igreja aberta no painel. Só vale se a conta fizer parte da equipe dela (conferido a cada pedido). */
export const COOKIE_IGREJA = "rebanho_igreja"

const igrejasDaConta = (clerkUserId: string) =>
  db.churchUser.findMany({ where: { clerkUserId }, include: { church: true }, orderBy: { createdAt: "asc" } })

/**
 * Liga à conta os convites da equipe feitos para os e-mails verificados dela. Se a conta já é da equipe daquela
 * igreja por outro e-mail, o convite repetido fica como está.
 */
export async function vincularConvites(clerkUserId: string, emails: string[]) {
  const lista = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
  if (lista.length === 0) return
  const pendentes = await db.churchUser.findMany({ where: { clerkUserId: null, email: { in: lista } } })
  for (const p of pendentes) {
    try {
      await db.churchUser.update({ where: { id: p.id, clerkUserId: null }, data: { clerkUserId, clerkInvitationId: null } })
    } catch (e) {
      // Já faz parte dessa igreja (P2002) ou outra requisição ligou antes (P2025): segue.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2025"].includes(e.code))) throw e
    }
  }
}

/**
 * Igreja e usuário da sessão: a igreja do cookie, se a conta fizer parte dela; senão, a única igreja da conta.
 * Só busca os e-mails (no Clerk) para ligar convites quando a conta ainda não tem a igreja pedida.
 */
export async function sessaoDaEquipe(clerkUserId: string, igrejaId: string | undefined, emails: () => Promise<string[]>) {
  let vinculos = await igrejasDaConta(clerkUserId)
  if (vinculos.length === 0 || (igrejaId && !vinculos.some((v) => v.churchId === igrejaId))) {
    await vincularConvites(clerkUserId, await emails())
    vinculos = await igrejasDaConta(clerkUserId)
  }
  const v = vinculos.find((x) => x.churchId === igrejaId) ?? (vinculos.length === 1 ? vinculos[0] : undefined)
  if (!v) throw new SemIgreja()
  if (!v.ativo) throw new ActionError("Seu acesso a esta igreja foi desativado pelo administrador.")
  const { church, ...user } = v
  return { church, user }
}

/** Sessão da requisição atual: igreja aberta e usuário com a sua função. Base de toda checagem no servidor. */
export const getSession = cache(async () => {
  const { userId } = await auth({ treatPendingAsSignedOut: false })
  if (!userId) throw new ActionError("Sua sessão expirou. Entre novamente.")
  const igrejaId = (await cookies()).get(COOKIE_IGREJA)?.value
  return sessaoDaEquipe(userId, igrejaId, async () => (await contaLogada())?.emails ?? [])
})

export type Session = Awaited<ReturnType<typeof getSession>>

/** Igrejas da conta para a tela de escolha, já com os convites pendentes ligados. */
export async function igrejasParaEscolher(clerkUserId: string, emails: string[]) {
  await vincularConvites(clerkUserId, emails)
  return igrejasDaConta(clerkUserId)
}

/** Cria a igreja com a sede e a conta como administradora. */
export function criarIgrejaPara(conta: { clerkUserId: string; nome: string; email: string }, nomeIgreja: string) {
  return db.church.create({
    data: {
      nome: nomeIgreja,
      congregations: { create: { nome: "Sede" } },
      users: { create: { clerkUserId: conta.clerkUserId, nome: conta.nome || conta.email, email: conta.email.toLowerCase(), papel: "admin" } },
    },
  })
}
