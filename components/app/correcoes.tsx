"use client"

import Link from "next/link"
import { ArrowRight, Check, MessageSquareText, X } from "lucide-react"

import { MemberAvatar } from "@/components/app/member-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { notify } from "@/hooks/use-form-action"
import { formatDate } from "@/lib/format"
import { useApp } from "@/lib/store"
import type { Endereco, Member, MemberCorrection } from "@/lib/types"

const linhaEndereco = (e: Endereco) => [e.rua && `${e.rua}, ${e.numero}`, e.bairro, e.cidade && `${e.cidade}/${e.uf}`, e.cep].filter(Boolean).join(" · ") || "—"

function Mudanca({ campo, de, para }: { campo: string; de: string; para: string }) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[90px_1fr]">
      <span className="text-muted-foreground">{campo}</span>
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground line-through">{de || "—"}</span>
        <ArrowRight className="size-3.5 text-muted-foreground" />
        <span className="font-medium">{para || "—"}</span>
      </span>
    </div>
  )
}

function Pedido({ c, m }: { c: MemberCorrection; m: Member }) {
  const resolveCorrection = useApp((s) => s.resolveCorrection)
  const outra = c.observacao && "A outra correção não muda sozinha: abra a ficha e edite."
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <MemberAvatar nome={m.nome} className="size-7 text-[10px]" />
        <Link href={`/app/membros/${m.id}`} className="font-medium hover:underline">{m.nome}</Link>
        <span className="text-xs text-muted-foreground">pediu em {formatDate(c.criadoEm.slice(0, 10))}</span>
      </div>
      {c.telefone !== undefined && <Mudanca campo="Telefone" de={m.telefone} para={c.telefone} />}
      {c.email !== undefined && <Mudanca campo="E-mail" de={m.email} para={c.email} />}
      {c.endereco && <Mudanca campo="Endereço" de={linhaEndereco(m.endereco)} para={linhaEndereco(c.endereco)} />}
      {c.observacao && (
        <p className="flex gap-2 rounded-md bg-muted/60 p-2 text-sm">
          <MessageSquareText className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> {c.observacao}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {outra && <span className="mr-auto text-xs text-muted-foreground">{outra}</span>}
        <Button
          size="sm"
          variant="outline"
          onClick={() => confirm(`Recusar o pedido de ${m.nome}? O cadastro continua como está.`) && notify(resolveCorrection({ id: c.id, aprovar: false }), "Pedido recusado")}
        >
          <X /> Recusar
        </Button>
        <Button size="sm" onClick={() => notify(resolveCorrection({ id: c.id, aprovar: true }), "Cadastro atualizado")}>
          <Check /> {c.telefone !== undefined || c.email !== undefined || c.endereco ? "Aprovar e atualizar" : "Marcar como resolvido"}
        </Button>
      </div>
    </div>
  )
}

/** Correções pedidas pelos membros no portal, para a secretaria aprovar ou recusar. Some quando não há nenhuma. */
export function CorrecoesPendentes() {
  const correcoes = useApp((s) => s.correcoes)
  const members = useApp((s) => s.members)
  const lista = correcoes.flatMap((c) => {
    const m = members.find((x) => x.id === c.membroId)
    return m ? [{ c, m }] : []
  })
  if (lista.length === 0) return null
  return (
    <Card className="mb-4 border-primary/40">
      <CardHeader>
        <CardTitle>Correções pedidas no portal ({lista.length})</CardTitle>
        <CardDescription>Os membros pediram para atualizar o cadastro. Confira antes de aprovar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {lista.map(({ c, m }) => <Pedido key={c.id} c={c} m={m} />)}
      </CardContent>
    </Card>
  )
}
