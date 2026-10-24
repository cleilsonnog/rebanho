"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2, Plus } from "lucide-react"

import { AppSidebar } from "@/components/app/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { useHydrated } from "@/hooks/use-hydrated"

export function AppShell({ children }: { children: React.ReactNode }) {
  // Os dados ainda vêm da store local (localStorage); espera ela carregar antes de renderizar.
  const hydrated = useHydrated()

  if (!hydrated)
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <span className="text-sm text-muted-foreground">Teste grátis: 14 dias restantes</span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Button size="sm" asChild>
              <Link href="/app/membros/novo"><Plus /> <span className="hidden sm:inline">Novo membro</span></Link>
            </Button>
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
