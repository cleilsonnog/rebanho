"use client"

import { useParams } from "next/navigation"
import { BadgeCheck, CircleAlert, Loader2 } from "lucide-react"

import { Logo } from "@/components/brand"
import { MemberAvatar } from "@/components/app/member-avatar"
import { Card, CardContent } from "@/components/ui/card"
import { useHydrated } from "@/hooks/use-hydrated"
import { STATUS_LABEL, formatDate } from "@/lib/format"
import { useApp, useMember } from "@/lib/store"

export default function VerificarPage() {
  const { id } = useParams<{ id: string }>()
  const hydrated = useHydrated()
  const m = useMember(id)
  const church = useApp((s) => s.church)

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/40 p-4">
      <Logo />
      <Card className="w-full max-w-sm">
        <CardContent className="py-4 text-center">
          {!hydrated ? (
            <Loader2 className="mx-auto animate-spin text-muted-foreground" />
          ) : !m ? (
            <>
              <CircleAlert className="mx-auto size-12 text-destructive" />
              <p className="mt-4 text-lg font-semibold">Carteirinha não encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground">Este código não corresponde a nenhum membro.</p>
            </>
          ) : (
            <>
              <MemberAvatar nome={m.nome} className="mx-auto size-20 text-2xl" />
              <p className="mt-4 font-heading text-2xl font-semibold">{m.nome}</p>
              <p className="text-sm text-muted-foreground">{church.nome}</p>
              <div
                className={`mt-6 flex items-center justify-center gap-2 rounded-xl p-3 font-medium ${
                  m.status === "ativo" ? "bg-success/12 text-success" : "bg-highlight/20 text-highlight-foreground"
                }`}
              >
                {m.status === "ativo" ? <BadgeCheck /> : <CircleAlert />}
                Membresia {STATUS_LABEL[m.status].toLowerCase()}
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-3 text-left text-sm">
                <div><dt className="text-xs text-muted-foreground">Cargo</dt><dd>{m.cargo}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Congregação</dt><dd>{m.congregacao}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Membro desde</dt><dd>{formatDate(m.membroDesde)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Código</dt><dd className="font-mono">#{m.id.toUpperCase()}</dd></div>
              </dl>
            </>
          )}
        </CardContent>
      </Card>
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Página pública de verificação. Exibe apenas dados mínimos, conforme a LGPD.
      </p>
    </div>
  )
}
