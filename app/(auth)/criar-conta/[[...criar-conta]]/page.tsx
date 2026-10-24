import { Suspense } from "react"
import type { Metadata } from "next"
import { Check } from "lucide-react"
import { SignUp } from "@clerk/nextjs"

export const metadata: Metadata = { title: "Criar conta" }

export default function CriarContaPage() {
  return (
    <>
      <ul className="mb-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {["14 dias grátis", "Sem cartão de crédito", "Membros ilimitados"].map((t) => (
          <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-success" /> {t}</li>
        ))}
      </ul>
      <Suspense>
        <SignUp />
      </Suspense>
    </>
  )
}
