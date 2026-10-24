"use client"

import Link from "next/link"
import { MenuIcon } from "lucide-react"

import { Logo } from "@/components/brand"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { FEATURES } from "@/lib/features"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />

        <NavigationMenu className="hidden md:flex" viewport={false}>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Funcionalidades</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[560px] grid-cols-2 gap-1 p-2">
                  {FEATURES.map((f) => (
                    <li key={f.slug}>
                      <NavigationMenuLink asChild>
                        <Link href={`/funcionalidades/${f.slug}`} className="flex flex-row items-start gap-3 rounded-lg p-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <f.icon className="size-4" />
                          </span>
                          <span>
                            <span className="block text-sm font-medium">{f.title}</span>
                            <span className="line-clamp-2 text-xs text-muted-foreground">{f.short}</span>
                          </span>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/#precos">Preços</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/#perguntas">Dúvidas</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" asChild>
            <Link href="/entrar">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/criar-conta">Criar conta grátis</Link>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-left">Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4 pb-6">
              <p className="px-2 pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Funcionalidades</p>
              {FEATURES.map((f) => (
                <Link key={f.slug} href={`/funcionalidades/${f.slug}`} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted">
                  <f.icon className="size-4 text-primary" /> {f.title}
                </Link>
              ))}
              <Link href="/#precos" className="rounded-md px-2 py-2 text-sm font-medium hover:bg-muted">Preços</Link>
              <Link href="/#perguntas" className="rounded-md px-2 py-2 text-sm font-medium hover:bg-muted">Dúvidas</Link>
              <div className="mt-4 grid gap-2">
                <Button variant="outline" asChild><Link href="/entrar">Entrar</Link></Button>
                <Button asChild><Link href="/criar-conta">Criar conta grátis</Link></Button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
