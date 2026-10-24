import Link from "next/link"
import { MessageCircle } from "lucide-react"

import { Logo } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { FEATURES } from "@/lib/features"

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="space-y-4 md:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            Gestão de membros, visitas, finanças e comunicação para igrejas de todos os tamanhos. 100% online, com backup diário.
          </p>
          <Button variant="outline" asChild>
            <a href="https://wa.me/5562999999999" target="_blank" rel="noreferrer">
              <MessageCircle /> Fale conosco no WhatsApp
            </a>
          </Button>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Funcionalidades</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {FEATURES.map((f) => (
              <li key={f.slug}>
                <Link href={`/funcionalidades/${f.slug}`} className="hover:text-foreground">{f.title}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Rebanho</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">Início</Link></li>
            <li><Link href="/#precos" className="hover:text-foreground">Preços</Link></li>
            <li><Link href="/entrar" className="hover:text-foreground">Entrar</Link></li>
            <li><Link href="/criar-conta" className="hover:text-foreground">Criar conta grátis</Link></li>
            <li><Link href="/privacidade" className="hover:text-foreground">Política de Privacidade</Link></li>
            <li><Link href="/termos" className="hover:text-foreground">Termos de Serviço</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">
          © 2026 Rebanho. Dados tratados conforme a LGPD.
        </p>
      </div>
    </footer>
  )
}
