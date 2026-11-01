import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { ShieldOff } from "lucide-react"

import { Logo } from "@/components/brand"
import { AppShell } from "@/components/app/app-shell"
import { ActionError, SemIgreja, getSession } from "@/lib/church"
import { loadAppData } from "@/lib/data"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth({ treatPendingAsSignedOut: false })
  if (!userId) redirect("/entrar")

  let session
  try {
    session = await getSession()
  } catch (e) {
    // Nenhuma igreja ainda, ou mais de uma sem escolha: vai para a tela de escolher ou cadastrar.
    if (e instanceof SemIgreja) redirect("/igreja")
    if (!(e instanceof ActionError)) throw e
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
        <Logo />
        <ShieldOff className="size-12 text-destructive" />
        <p className="max-w-sm text-muted-foreground">{e.message}</p>
        <a href="/igreja" className="text-sm text-primary hover:underline">Escolher outra igreja</a>
      </div>
    )
  }

  return <AppShell data={await loadAppData(session)}>{children}</AppShell>
}
