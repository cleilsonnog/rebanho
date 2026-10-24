import { Suspense } from "react"
import type { Metadata } from "next"
import { SignIn } from "@clerk/nextjs"

export const metadata: Metadata = { title: "Entrar" }

export default function EntrarPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  )
}
