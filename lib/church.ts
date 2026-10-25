import "server-only"

import { cache } from "react"
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"

import { db } from "./db"
import { Prisma } from "./generated/prisma/client"

/** Erro com mensagem que pode ser mostrada ao usuário. */
export class ActionError extends Error {}

/** Devolve a igreja ligada à organização do Clerk, criando o registro no primeiro acesso. */
export const ensureChurch = cache(async (orgId: string) => {
  const existing = await db.church.findUnique({ where: { clerkOrgId: orgId } })
  if (existing) return existing

  const org = await (await clerkClient()).organizations.getOrganization({ organizationId: orgId })
  return db.church.upsert({
    where: { clerkOrgId: orgId },
    create: { clerkOrgId: orgId, nome: org.name, congregations: { create: { nome: "Sede" } } },
    update: {},
  })
})

/**
 * Devolve o usuário da igreja. No primeiro acesso, liga o login do Clerk ao convite feito pelo e-mail;
 * sem convite, quem criou a organização vira admin e os demais entram com a função de menor acesso.
 */
async function ensureChurchUser(churchId: string, clerkUserId: string, orgRole?: string | null) {
  const isOrgAdmin = orgRole === "org:admin"
  const linked = await db.churchUser.findUnique({ where: { churchId_clerkUserId: { churchId, clerkUserId } } })
  if (linked) {
    if (isOrgAdmin && (linked.papel !== "admin" || !linked.ativo))
      return db.churchUser.update({ where: { id: linked.id }, data: { papel: "admin", ativo: true } })
    return linked
  }

  const user = await currentUser()
  if (!user) throw new ActionError("Sua sessão expirou. Entre novamente.")
  const emails = user.emailAddresses.map((e) => e.emailAddress.toLowerCase())
  const nome = user.fullName || emails[0] || "Usuário"

  try {
    const convite = await db.churchUser.findFirst({ where: { churchId, clerkUserId: null, email: { in: emails } } })
    if (convite)
      return await db.churchUser.update({
        where: { id: convite.id },
        data: { clerkUserId, clerkInvitationId: null, ...(isOrgAdmin && { papel: "admin", ativo: true }) },
      })
    return await db.churchUser.create({
      data: { churchId, clerkUserId, nome, email: emails[0] ?? "", papel: isOrgAdmin ? "admin" : "lider" },
    })
  } catch (e) {
    // Duas requisições simultâneas no primeiro acesso: a outra já criou o registro.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return db.churchUser.findUniqueOrThrow({ where: { churchId_clerkUserId: { churchId, clerkUserId } } })
    throw e
  }
}

/** Sessão da requisição atual: igreja ativa e usuário com a sua função. Base de toda checagem no servidor. */
export const getSession = cache(async () => {
  const { userId, orgId, orgRole } = await auth()
  if (!userId || !orgId) throw new ActionError("Sua sessão expirou. Entre novamente.")

  const church = await ensureChurch(orgId)
  const user = await ensureChurchUser(church.id, userId, orgRole)
  if (!user.ativo) throw new ActionError("Seu acesso a esta igreja foi desativado pelo administrador.")
  return { church, user }
})

export type Session = Awaited<ReturnType<typeof getSession>>
