import { Suspense } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { OrganizationList } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"

export const metadata: Metadata = { title: "Sua igreja" }

export default async function IgrejaPage() {
  const { userId } = await auth({ treatPendingAsSignedOut: false })
  if (!userId) redirect("/entrar")

  return (
    <>
      <h1 className="text-3xl font-semibold">Sua igreja</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">
        Cadastre a sua igreja ou entre em uma para a qual você foi convidado.
      </p>
      <Suspense>
        <OrganizationList hidePersonal afterCreateOrganizationUrl="/app" afterSelectOrganizationUrl="/app" />
      </Suspense>
    </>
  )
}
