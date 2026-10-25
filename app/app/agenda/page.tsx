"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { notify, useFormAction } from "@/hooks/use-form-action"
import { MONTHS_LONG, TODAY, formatDateLong } from "@/lib/format"
import { canWrite } from "@/lib/permissions"
import { useApp } from "@/lib/store"
import type { ChurchEvent } from "@/lib/types"
import { eventSchema } from "@/lib/validations"
import { cn } from "@/lib/utils"

const TIPO: Record<ChurchEvent["tipo"], { label: string; className: string }> = {
  culto: { label: "Culto", className: "bg-primary/12 text-primary" },
  reuniao: { label: "Reunião", className: "bg-chart-3/15 text-chart-3" },
  evento: { label: "Evento", className: "bg-highlight/25 text-highlight-foreground dark:text-highlight" },
  ensaio: { label: "Ensaio", className: "bg-chart-4/15 text-chart-4" },
  curso: { label: "Curso", className: "bg-success/15 text-success" },
}
const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

function NovoEvento({ open, onOpenChange, data }: { open: boolean; onOpenChange: (o: boolean) => void; data: string }) {
  const addEvent = useApp((s) => s.addEvent)
  const [tipo, setTipo] = React.useState<ChurchEvent["tipo"]>("culto")
  const { errors, pending, submit, invalid } = useFormAction()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const evento = {
      titulo: String(f.get("titulo")),
      data: String(f.get("data")),
      hora: String(f.get("hora")),
      local: String(f.get("local")),
      descricao: String(f.get("descricao")),
      tipo,
    }
    submit(eventSchema, evento, () => addEvent(evento), () => {
      toast.success("Evento adicionado à agenda")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo evento</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="titulo">Título</FieldLabel>
              <Input {...invalid("titulo")} id="titulo" name="titulo" required placeholder="Ex.: Culto de Santa Ceia" />
              <FieldError>{errors.titulo}</FieldError>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="data">Data</FieldLabel>
                <Input {...invalid("data")} id="data" name="data" type="date" defaultValue={data} required />
                <FieldError>{errors.data}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="hora">Hora</FieldLabel>
                <Input {...invalid("hora")} id="hora" name="hora" type="time" defaultValue="19:00" required />
                <FieldError>{errors.hora}</FieldError>
              </Field>
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <Select value={tipo} onValueChange={(v) => setTipo(v as ChurchEvent["tipo"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TIPO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="local">Local</FieldLabel>
              <Input {...invalid("local")} id="local" name="local" defaultValue="Sede" required />
              <FieldError>{errors.local}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
              <Textarea {...invalid("descricao")} id="descricao" name="descricao" rows={3} />
              <FieldError>{errors.descricao}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function AgendaPage() {
  const events = useApp((s) => s.events)
  const removeEvent = useApp((s) => s.removeEvent)
  const pode = useApp((s) => canWrite(s.me.papel, "agenda"))
  const [cursor, setCursor] = React.useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))
  const [selected, setSelected] = React.useState(iso(TODAY))
  const [open, setOpen] = React.useState(false)

  const porDia = React.useMemo(() => {
    const map = new Map<string, ChurchEvent[]>()
    for (const e of events) map.set(e.data, [...(map.get(e.data) ?? []), e])
    return map
  }, [events])

  const first = new Date(cursor)
  first.setDate(1 - first.getDay())
  const days = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i))
  const doDia = porDia.get(selected) ?? []
  const move = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1))

  return (
    <>
      <PageHeader title="Agenda" description="Cultos, reuniões, ensaios e eventos da igreja.">
        {pode && <Button onClick={() => setOpen(true)}><Plus /> Novo evento</Button>}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{MONTHS_LONG[cursor.getMonth()]} {cursor.getFullYear()}</CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => move(-1)} aria-label="Mês anterior"><ChevronLeft /></Button>
              <Button variant="outline" size="sm" onClick={() => { setCursor(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)); setSelected(iso(TODAY)) }}>Hoje</Button>
              <Button variant="outline" size="icon-sm" onClick={() => move(1)} aria-label="Próximo mês"><ChevronRight /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
              {WEEK.map((w) => <div key={w} className="py-2">{w}</div>)}
            </div>
            <div className="grid grid-cols-7 overflow-hidden rounded-lg border">
              {days.map((d) => {
                const key = iso(d)
                const evs = porDia.get(key) ?? []
                const outside = d.getMonth() !== cursor.getMonth()
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    className={cn(
                      "flex min-h-16 flex-col gap-1 border-r border-b p-1.5 text-left text-xs transition hover:bg-muted sm:min-h-24 [&:nth-child(7n)]:border-r-0",
                      outside && "bg-muted/40 text-muted-foreground",
                      key === selected && "bg-primary/8 ring-2 ring-primary ring-inset"
                    )}
                  >
                    <span className={cn("flex size-6 items-center justify-center rounded-full", key === iso(TODAY) && "bg-primary font-semibold text-primary-foreground")}>
                      {d.getDate()}
                    </span>
                    <div className="hidden space-y-0.5 sm:block">
                      {evs.slice(0, 2).map((e) => (
                        <p key={e.id} className={cn("truncate rounded px-1 py-0.5", TIPO[e.tipo].className)}>{e.hora} {e.titulo}</p>
                      ))}
                      {evs.length > 2 && <p className="px-1 text-muted-foreground">+{evs.length - 2}</p>}
                    </div>
                    <div className="flex gap-0.5 sm:hidden">
                      {evs.map((e) => <span key={e.id} className="size-1.5 rounded-full bg-primary" />)}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle className="text-base first-letter:uppercase">{formatDateLong(selected)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {doDia.length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>}
            {doDia.map((e) => (
              <div key={e.id} className="group rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{e.titulo}</p>
                  <Badge className={TIPO[e.tipo].className}>{TIPO[e.tipo].label}</Badge>
                </div>
                <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="size-3.5" />{e.hora}</span>
                  <span className="flex items-center gap-1"><MapPin className="size-3.5" />{e.local}</span>
                </p>
                {e.descricao && <p className="mt-2 text-sm text-muted-foreground">{e.descricao}</p>}
                <Button variant="ghost" size="xs" className="mt-2 text-destructive opacity-0 group-hover:opacity-100" hidden={!pode} onClick={() => confirm("Excluir este evento?") && notify(removeEvent(e.id), "Evento excluído")}>
                  <Trash2 /> Remover
                </Button>
              </div>
            ))}
            {pode && <Button variant="outline" className="w-full" onClick={() => setOpen(true)}><Plus /> Adicionar neste dia</Button>}
          </CardContent>
        </Card>
      </div>

      <NovoEvento key={`${open}${selected}`} open={open && pode} onOpenChange={setOpen} data={selected} />
    </>
  )
}
