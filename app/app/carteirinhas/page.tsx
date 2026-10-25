"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { ExternalLink, Printer, Search } from "lucide-react"

import { AccessGuard } from "@/components/app/access-guard"
import { MemberCardBack, MemberCardFront } from "@/components/app/member-card"
import { MemberAvatar } from "@/components/app/member-avatar"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { TODAY } from "@/lib/format"
import { useApp } from "@/lib/store"

function CarteirinhasContent() {
  const params = useSearchParams()
  const members = useApp((s) => s.members)
  const church = useApp((s) => s.church)
  const elegiveis = members.filter((m) => m.status === "ativo" || m.status === "afastado").sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  const inicial = params.get("membro")
  const [selected, setSelected] = React.useState<string[]>(inicial ? [inicial] : elegiveis.slice(0, 1).map((m) => m.id))
  const [q, setQ] = React.useState("")
  const [validade, setValidade] = React.useState(`12/${TODAY.getFullYear() + 1}`)
  // Só renderiza no navegador (o layout do app espera a store reidratar).
  const origin = typeof window === "undefined" ? "" : window.location.origin

  const preview = members.find((m) => m.id === selected[0])
  const lista = elegiveis.filter((m) => m.nome.toLowerCase().includes(q.toLowerCase()))
  const escolhidos = members.filter((m) => selected.includes(m.id))
  const url = (id: string) => `${origin}/verificar/${id}`

  return (
    <>
      <PageHeader title="Carteirinhas" description="Carteirinha com QR Code que qualquer pessoa pode escanear para confirmar a membresia.">
        <Button disabled={escolhidos.length === 0} onClick={() => window.print()}>
          <Printer /> Imprimir {escolhidos.length > 1 ? `${escolhidos.length} carteirinhas` : "carteirinha"}
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="self-start">
          <CardHeader><CardTitle className="text-base">Membros ({selected.length} selecionados)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="pl-8" />
            </div>
            <div className="flex gap-2 text-xs">
              <Button size="xs" variant="outline" onClick={() => setSelected(lista.map((m) => m.id))}>Selecionar todos</Button>
              <Button size="xs" variant="ghost" onClick={() => setSelected([])}>Limpar</Button>
            </div>
            <div className="max-h-[440px] space-y-1 overflow-y-auto">
              {lista.map((m) => (
                <label key={m.id} className="flex items-center gap-2 rounded-md p-1.5 text-sm hover:bg-muted">
                  <Checkbox
                    checked={selected.includes(m.id)}
                    onCheckedChange={(c) => setSelected((s) => (c ? [m.id, ...s] : s.filter((x) => x !== m.id)))}
                  />
                  <MemberAvatar nome={m.nome} className="size-6 text-[10px]" />
                  <span className="truncate">{m.nome}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Pré-visualização</CardTitle></CardHeader>
            <CardContent>
              {preview ? (
                <div className="grid gap-6 xl:grid-cols-2">
                  <MemberCardFront m={preview} church={church} validade={validade} />
                  <MemberCardBack m={preview} church={church} url={url(preview.id)} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Selecione alguém na lista.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Field className="sm:w-48">
                <FieldLabel htmlFor="val">Validade</FieldLabel>
                <Input id="val" value={validade} onChange={(e) => setValidade(e.target.value)} />
              </Field>
              {preview && (
                <Button variant="outline" asChild>
                  <a href={`/verificar/${preview.id}`} target="_blank" rel="noreferrer"><ExternalLink /> Testar página de verificação</a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="print-area hidden print:block">
        {escolhidos.map((m) => (
          <div key={m.id} className="mb-6 flex break-inside-avoid gap-6">
            <MemberCardFront m={m} church={church} validade={validade} />
            <MemberCardBack m={m} church={church} url={url(m.id)} />
          </div>
        ))}
      </div>
    </>
  )
}

export default function CarteirinhasPage() {
  return (
    <AccessGuard area="certificados" title="Carteirinhas">
      <React.Suspense>
        <CarteirinhasContent />
      </React.Suspense>
    </AccessGuard>
  )
}
