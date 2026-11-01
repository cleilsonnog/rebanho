import "server-only"

import { currentUser } from "@clerk/nextjs/server"

/**
 * Conta logada no Clerk e os e-mails verificados dela. É pelo e-mail verificado que o Rebanho liga a conta a um
 * convite da equipe ou a um cadastro com o portal liberado. `treatPendingAsSignedOut: false`: enquanto o Clerk
 * ainda pedir organização (configuração antiga), a sessão fica "pendente" e mesmo assim vale. Separado para os
 * testes simularem o login.
 */
export async function contaLogada() {
  const user = await currentUser({ treatPendingAsSignedOut: false })
  if (!user) return null
  return {
    userId: user.id,
    nome: user.fullName ?? "",
    emails: user.emailAddresses.filter((e) => e.verification?.status === "verified").map((e) => e.emailAddress),
  }
}
