"use server"

import type { z } from "zod"
import { headers } from "next/headers"
import { clerkClient } from "@clerk/nextjs/server"

import { secureAction } from "../action"
import { ActionError } from "../church"
import { db } from "../db"
import { assertMembers, toUser, userInclude } from "../data"
import { limitar } from "../rate-limit"
import { idSchema, inviteSchema, updateUserSchema } from "../validations"

// Gestão de usuários é só do admin (área `null` no secureAction).

/** Id da filial pelo nome; vazio = igreja toda. A restrição por filial só vale para secretaria e pastor. */
async function filialId(churchId: string, nome: string | null | undefined, papel: string) {
  if (!nome || (papel !== "secretaria" && papel !== "pastor")) return null
  const c = await db.congregation.findFirst({ where: { churchId, nome }, select: { id: true } })
  if (!c) throw new ActionError(`A filial "${nome}" não existe.`)
  return c.id
}

export async function inviteUser(input: z.input<typeof inviteSchema>) {
  return secureAction(null, inviteSchema, input, async ({ nome, email, papel, memberId, congregacao }, { church, user }) => {
    if (!church.clerkOrgId) throw new ActionError("Igreja sem organização no Clerk.")
    if (memberId) await assertMembers(church.id, [memberId])
    const congregationId = await filialId(church.id, congregacao, papel)
    await limitar("convite", church.id)
    const row = await db.churchUser.create({
      data: { churchId: church.id, nome, email: email.toLowerCase(), papel, memberId, congregationId },
    })

    // O link do e-mail volta para o login do Rebanho (o <SignIn /> trata o convite), e não para a página padrão do Clerk.
    const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL

    try {
      // No Clerk todos são membros comuns; a função de verdade fica no banco (ChurchUser.papel).
      const convite = await (await clerkClient()).organizations.createOrganizationInvitation({
        organizationId: church.clerkOrgId,
        inviterUserId: user.clerkUserId ?? undefined,
        emailAddress: email,
        role: "org:member",
        redirectUrl: origin ? `${origin}/entrar` : undefined,
      })
      return toUser(
        await db.churchUser.update({ where: { id: row.id }, data: { clerkInvitationId: convite.id }, include: userInclude })
      )
    } catch (e) {
      await db.churchUser.delete({ where: { id: row.id } })
      console.error("[inviteUser] Clerk", e)
      throw new ActionError("Não foi possível enviar o convite. Confira se a pessoa já não faz parte da igreja.")
    }
  })
}

export async function updateUser(id: string, input: z.input<typeof updateUserSchema>) {
  const schema = updateUserSchema.extend({ id: idSchema })
  return secureAction(null, schema, { ...input, id }, async ({ id, congregacao, ...data }, { church, user }) => {
    // Impede o admin de se rebaixar ou se desativar e deixar a igreja sem administrador.
    if (id === user.id && (data.papel || data.ativo !== undefined)) throw new ActionError("Você não pode alterar o seu próprio acesso.")
    if (data.memberId) await assertMembers(church.id, [data.memberId])
    const atual = await db.churchUser.findUniqueOrThrow({ where: { id, churchId: church.id } })
    const papel = data.papel ?? atual.papel
    // Trocar para uma função sem filial (ex.: tesouraria) limpa a restrição; mudar a filial só se veio no pedido.
    const congregationId =
      congregacao !== undefined ? await filialId(church.id, congregacao, papel) : papel === "secretaria" || papel === "pastor" ? undefined : null
    return toUser(
      await db.churchUser.update({ where: { id, churchId: church.id }, data: { ...data, congregationId }, include: userInclude })
    )
  })
}

export async function removeUser(id: string) {
  return secureAction(null, idSchema, id, async (id, { church, user }) => {
    if (id === user.id) throw new ActionError("Você não pode remover a si mesmo.")
    const alvo = await db.churchUser.findUniqueOrThrow({ where: { id, churchId: church.id } })

    if (church.clerkOrgId) {
      const clerk = await clerkClient()
      const organizationId = church.clerkOrgId
      // Tira o acesso no Clerk também. Se já não existir lá, segue a remoção local.
      await Promise.resolve(
        alvo.clerkUserId
          ? clerk.organizations.deleteOrganizationMembership({ organizationId, userId: alvo.clerkUserId })
          : alvo.clerkInvitationId &&
              clerk.organizations.revokeOrganizationInvitation({
                organizationId,
                invitationId: alvo.clerkInvitationId,
                requestingUserId: user.clerkUserId ?? undefined,
              })
      ).catch((e) => console.error("[removeUser] Clerk", e))
    }
    await db.churchUser.delete({ where: { id: alvo.id } })
  })
}
