import { Suspense } from "react"
import type { Metadata } from "next"
import { SignIn } from "@clerk/nextjs"

export const metadata: Metadata = { title: "Portal do membro" }

// Entrada do portal do membro: o e-mail tem que ser o do cadastro na igreja, com o portal liberado pela secretaria.
// Quem ainda não tem conta cria ali mesmo (withSignUp), confirmando o e-mail pelo código.
export default function EntrarPortalPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Portal do membro</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Entre com o e-mail que você deu à secretaria da sua igreja. Você recebe um código nele para confirmar.
      </p>
      <Suspense>
        <SignIn path="/membro/entrar" withSignUp forceRedirectUrl="/membro" signUpForceRedirectUrl="/membro" />
      </Suspense>
    </>
  )
}
