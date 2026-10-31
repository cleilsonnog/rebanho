import "server-only"

import { currentUser } from "@clerk/nextjs/server"

/**
 * Conta logada no Clerk e os e-mails verificados dela. A sessão do membro fica "pendente" (ele não faz parte
 * da organização da igreja), por isso `treatPendingAsSignedOut: false`. Separado de lib/portal.ts para os testes
 * simularem o login.
 */
export async function loginDoPortal() {
  const user = await currentUser({ treatPendingAsSignedOut: false })
  if (!user) return null
  return { userId: user.id, emails: user.emailAddresses.filter((e) => e.verification?.status === "verified").map((e) => e.emailAddress) }
}
