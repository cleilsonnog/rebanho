import type { Metadata } from "next"
import { BadgeCheck, CircleAlert } from "lucide-react"

import { Logo } from "@/components/brand"
import { MemberAvatar } from "@/components/app/member-avatar"
import { Card, CardContent } from "@/components/ui/card"
import { db } from "@/lib/db"
import { STATUS_LABEL, formatDate } from "@/lib/format"
import { clientIp, rateLimit } from "@/lib/rate-limit"
import { idSchema } from "@/lib/validations"

export const metadata: Metadata = { title: "Verificar carteirinha", robots: { index: false } }

// Página pública (QR Code da carteirinha): mostra só o necessário para conferir a membresia.
async function buscar(id: string) {
  if (!idSchema.safeParse(id).success) return null
  return db.member.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      status: true,
      cargo: true,
      membroDesde: true,
      congregation: { select: { nome: true } },
      church: { select: { nome: true, logoUrl: true } },
    },
  })
}

export default async function VerificarPage({ params }: { params: Promise<{ id: string }> }) {
  // Única rota de dados sem login: limita por IP para impedir varredura de códigos.
  const limite = await rateLimit("verificar", await clientIp())
  if (!limite.ok)
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-4 text-center">
        <Logo />
        <CircleAlert className="size-12 text-destructive" />
        <p className="max-w-sm text-muted-foreground">Muitas consultas seguidas. Aguarde {limite.retryAfter} segundos e tente de novo.</p>
      </div>
    )

  const m = await buscar((await params).id)

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/40 p-4">
      <Logo />
      <Card className="w-full max-w-sm">
        <CardContent className="py-4 text-center">
          {!m ? (
            <>
              <CircleAlert className="mx-auto size-12 text-destructive" />
              <p className="mt-4 text-lg font-semibold">Carteirinha não encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground">Este código não corresponde a nenhum membro.</p>
            </>
          ) : (
            <>
              <MemberAvatar nome={m.nome} className="mx-auto size-20 text-2xl" />
              <p className="mt-4 font-heading text-2xl font-semibold">{m.nome}</p>
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {m.church.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.church.logoUrl} alt="" className="size-6 object-contain" />
                )}
                {m.church.nome}
              </p>
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
                <div><dt className="text-xs text-muted-foreground">Congregação</dt><dd>{m.congregation?.nome ?? "—"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Membro desde</dt><dd>{formatDate(m.membroDesde.toISOString().slice(0, 10))}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Código</dt><dd className="font-mono">#{m.id.slice(0, 8).toUpperCase()}</dd></div>
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
