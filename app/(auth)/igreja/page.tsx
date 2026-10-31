import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { OrganizationList } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"

import { db } from "@/lib/db"
import { emailsDoLogin, resolverAcesso } from "@/lib/portal"

export const metadata: Metadata = { title: "Sua igreja" }

export default async function IgrejaPage() {
  const { userId } = await auth({ treatPendingAsSignedOut: false })
  if (!userId) redirect("/entrar")

  // O Clerk manda para cá quem entrou sem igreja escolhida, inclusive o membro do portal (que não faz parte da
  // organização). Quem não é da equipe de nenhuma igreja e tem o portal liberado vai direto para o portal.
  const acesso = await resolverAcesso((await emailsDoLogin()) ?? [])
  const temPortal = acesso.tipo !== "sem-acesso"
  const daEquipe = (await db.churchUser.count({ where: { clerkUserId: userId } })) > 0
  if (temPortal && !daEquipe) redirect("/membro")

  return (
    <>
      <h1 className="text-3xl font-semibold">Sua igreja</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">
        Cadastre a sua igreja ou entre em uma para a qual você foi convidado.
      </p>
      <Suspense>
        <OrganizationList hidePersonal afterCreateOrganizationUrl="/app" afterSelectOrganizationUrl="/app" />
      </Suspense>
      {temPortal && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Quer ver seus dados de membro? <Link href="/membro" className="text-primary hover:underline">Abrir o portal do membro</Link>
        </p>
      )}
    </>
  )
}
