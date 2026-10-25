"use client"

import * as React from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { AppSidebar } from "@/components/app/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { canWrite } from "@/lib/permissions"
import { AppStoreProvider, useApp } from "@/lib/store"
import type { AppData } from "@/lib/types"

export function AppShell({ data, children }: { data: AppData; children: React.ReactNode }) {
  return (
    <AppStoreProvider data={data}>
      <Shell>{children}</Shell>
    </AppStoreProvider>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  const podeCadastrar = useApp((s) => canWrite(s.me.papel, "membros"))

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
            {podeCadastrar && (
              <Button size="sm" asChild>
                <Link href="/app/membros/novo"><Plus /> <span className="hidden sm:inline">Novo membro</span></Link>
              </Button>
            )}
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
