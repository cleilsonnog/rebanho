import Link from "next/link"
import { Quote } from "lucide-react"

import { Logo } from "@/components/brand"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col p-6 md:p-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Ao continuar você concorda com os <Link href="/termos" className="underline">Termos</Link> e a{" "}
          <Link href="/privacidade" className="underline">Política de Privacidade</Link>.
        </p>
      </div>
      <div className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-end lg:p-12">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-primary-foreground/10" />
        <div className="absolute top-40 -left-16 size-64 rounded-full bg-highlight/20" />
        <Quote className="relative size-10 text-highlight" />
        <blockquote className="relative mt-6 font-heading text-3xl leading-snug">
          Procura conhecer o estado das tuas ovelhas; cuida bem dos teus rebanhos.
        </blockquote>
        <p className="relative mt-4 opacity-80">Provérbios 27:23</p>
      </div>
    </div>
  )
}
