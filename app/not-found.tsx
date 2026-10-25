import Link from "next/link"
import { SearchX } from "lucide-react"

import { Logo } from "@/components/brand"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <Logo />
      <SearchX className="size-12 text-muted-foreground" />
      <div>
        <h1 className="font-heading text-3xl font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-muted-foreground">O endereço pode estar errado ou a página mudou de lugar.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" asChild><Link href="/">Início</Link></Button>
        <Button asChild><Link href="/app">Ir para o painel</Link></Button>
      </div>
    </div>
  )
}
