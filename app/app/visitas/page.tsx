"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CalendarCheck, CalendarClock, HeartHandshake, Plus, Trash2, UserMinus } from "lucide-react"
import { toast } from "sonner"

import { MemberAvatar } from "@/components/app/member-avatar"
import { MemberPicker } from "@/components/app/member-picker"
import { PageHeader, StatCard } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { TODAY, formatDate, parseISO } from "@/lib/format"
import { MOTIVOS_VISITA } from "@/lib/seed"
import { useApp } from "@/lib/store"

const RESPONSAVEIS = ["Pr. Samuel Rocha", "Pra. Débora Rocha", "Pb. André Lima", "Ev. Paulo Mendes"]
const hoje = TODAY.toISOString().slice(0, 10)

function NovaVisitaDialog({ open, onOpenChange, membroInicial }: { open: boolean; onOpenChange: (o: boolean) => void; membroInicial?: string }) {
  const addVisit = useApp((s) => s.addVisit)
  const [membroId, setMembroId] = React.useState(membroInicial)
  const [motivo, setMotivo] = React.useState<string>(MOTIVOS_VISITA[0])
  const [responsavel, setResponsavel] = React.useState(RESPONSAVEIS[0])

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!membroId) return toast.error("Escolha quem foi visitado")
    const f = new FormData(e.currentTarget)
    addVisit({
      membroId,
      motivo,
      responsavel,
      data: String(f.get("data")),
      notas: String(f.get("notas")),
      proximaVisita: String(f.get("proxima")) || undefined,
    })
    toast.success("Visita registrada no histórico")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar visita</DialogTitle>
          <DialogDescription>A visita entra no histórico da pessoa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Pessoa visitada</FieldLabel>
              <MemberPicker value={membroId} onChange={setMembroId} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="data">Data</FieldLabel>
                <Input id="data" name="data" type="date" defaultValue={hoje} required />
              </Field>
              <Field>
                <FieldLabel>Motivo</FieldLabel>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{MOTIVOS_VISITA.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel>Responsável</FieldLabel>
              <Select value={responsavel} onValueChange={setResponsavel}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{RESPONSAVEIS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="notas">Anotações</FieldLabel>
              <Textarea id="notas" name="notas" rows={4} required placeholder="O que foi conversado, pedidos de oração, combinados…" />
            </Field>
            <Field>
              <FieldLabel htmlFor="proxima">Próxima visita (opcional)</FieldLabel>
              <Input id="proxima" name="proxima" type="date" min={hoje} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Salvar visita</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function VisitasContent() {
  const params = useSearchParams()
  const [open, setOpen] = React.useState(params.get("nova") === "1")
  const [resp, setResp] = React.useState("todos")
  const visits = useApp((s) => s.visits)
  const members = useApp((s) => s.members)
  const removeVisit = useApp((s) => s.removeVisit)
  const byId = React.useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  const mes = hoje.slice(0, 7)
  const doMes = visits.filter((v) => v.data.startsWith(mes)).length
  const agendadas = visits.filter((v) => v.proximaVisita && v.proximaVisita >= hoje).sort((a, b) => a.proximaVisita!.localeCompare(b.proximaVisita!))
  const visitados = new Set(visits.filter((v) => (TODAY.getTime() - parseISO(v.data).getTime()) / 86_400_000 <= 60).map((v) => v.membroId))
  const afastadosSemVisita = members.filter((m) => m.status === "afastado" && !visitados.has(m.id)).length
  const lista = visits.filter((v) => resp === "todos" || v.responsavel === resp)

  return (
    <>
      <PageHeader title="Visitas pastorais" description="Cada visita fica no histórico, para quem for depois chegar com contexto.">
        <Button onClick={() => setOpen(true)}><Plus /> Registrar visita</Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Visitas em outubro" value={doMes} icon={CalendarCheck} />
        <StatCard label="Visitas agendadas" value={agendadas.length} icon={CalendarClock} tone="highlight" />
        <StatCard label="Afastados sem visita (60 dias)" value={afastadosSemVisita} icon={UserMinus} tone="destructive" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>Histórico</CardTitle>
            <Select value={resp} onValueChange={setResp}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos responsáveis</SelectItem>
                {RESPONSAVEIS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-3">
            {lista.map((v) => {
              const m = byId.get(v.membroId)
              if (!m) return null
              return (
                <div key={v.id} className="group rounded-xl border p-4">
                  <div className="flex items-start gap-3">
                    <MemberAvatar nome={m.nome} className="size-9" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/app/membros/${m.id}`} className="font-medium hover:underline">{m.nome}</Link>
                        <Badge variant="secondary">{v.motivo}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(v.data)} · {v.responsavel} · {m.endereco.bairro}</p>
                      <p className="mt-2 text-sm">{v.notas}</p>
                      {v.proximaVisita && (
                        <p className="mt-2 flex items-center gap-1 text-xs text-primary"><CalendarClock className="size-3.5" /> Próxima visita {formatDate(v.proximaVisita)}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100"
                      aria-label="Excluir visita"
                      onClick={() => confirm("Excluir esta visita?") && removeVisit(v.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader><CardTitle className="flex items-center gap-2"><HeartHandshake className="size-4 text-primary" /> Próximas visitas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {agendadas.length === 0 && <p className="text-sm text-muted-foreground">Nada agendado.</p>}
            {agendadas.slice(0, 10).map((v) => {
              const m = byId.get(v.membroId)
              return m ? (
                <Link key={v.id} href={`/app/membros/${m.id}`} className="flex items-center justify-between gap-2 rounded-lg p-1 text-sm hover:bg-muted">
                  <span className="truncate">{m.nome}</span>
                  <Badge variant="outline">{formatDate(v.proximaVisita)}</Badge>
                </Link>
              ) : null
            })}
          </CardContent>
        </Card>
      </div>

      <NovaVisitaDialog key={String(open)} open={open} onOpenChange={setOpen} membroInicial={params.get("membro") ?? undefined} />
    </>
  )
}

export default function VisitasPage() {
  return (
    <React.Suspense>
      <VisitasContent />
    </React.Suspense>
  )
}
