"use client"

import { Lock } from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { canRead, type Area } from "@/lib/permissions"
import { useApp } from "@/lib/store"

/**
 * Aviso para quem abre uma tela que a sua função não vê. Os dados dela nem chegam ao navegador
 * (lib/data.ts › loadAppData); isto só evita mostrar uma tela vazia sem explicação.
 */
export function AccessGuard({ area, title, children }: { area: Area; title: string; children: React.ReactNode }) {
  const papel = useApp((s) => s.me.papel)
  if (canRead(papel, area)) return children
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <Lock className="size-5" />
          Sua função não tem acesso a esta área. Fale com o administrador da igreja se precisar.
        </CardContent>
      </Card>
    </>
  )
}
