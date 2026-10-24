import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { AppShell } from "@/components/app/app-shell"
import { ensureChurch } from "@/lib/church"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Sessão "pendente" = logado mas ainda sem igreja escolhida; vai para /igreja em vez de /entrar.
  const { userId, orgId } = await auth({ treatPendingAsSignedOut: false })
  if (!userId) redirect("/entrar")
  if (!orgId) redirect("/igreja")

  await ensureChurch(orgId)

  return <AppShell>{children}</AppShell>
}
