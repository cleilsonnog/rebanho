"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Building2, MapPin, MapPinOff, Pencil, Phone, Plus, Trash2, User } from "lucide-react"
import { toast } from "sonner"

import { PinPicker } from "@/components/app/pin-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { notify, useFormAction } from "@/hooks/use-form-action"
import { useApp } from "@/lib/store"
import type { Endereco, Filial } from "@/lib/types"
import { filialSchema } from "@/lib/validations"

type Draft = { nome: string; dirigente: string; telefone: string; endereco: Endereco; lat: number; lng: number }

function FilialDialog({ filial, onClose }: { filial?: Filial; onClose: () => void }) {
  const router = useRouter()
  const saveFilial = useApp((s) => s.saveFilial)
  const cidadeIgreja = useApp((s) => s.church.endereco)
  const { errors, pending, submit, invalid } = useFormAction()
  const [d, setD] = React.useState<Draft>(() =>
    filial
      ? { nome: filial.nome, dirigente: filial.dirigente, telefone: filial.telefone, endereco: filial.endereco, lat: filial.lat, lng: filial.lng }
      : {
          nome: "",
          dirigente: "",
          telefone: "",
          endereco: { rua: "", numero: "", bairro: "", cidade: cidadeIgreja.cidade, uf: cidadeIgreja.uf, cep: "" },
          lat: 0,
          lng: 0,
        }
  )
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }))
  // Mudou o endereço: o pino antigo deixa de valer (sem pino, o servidor localiza ao salvar).
  const setEnd = (k: keyof Endereco, v: string) => setD((s) => ({ ...s, endereco: { ...s.endereco, [k]: v }, lat: 0, lng: 0 }))
  const sede = filial?.sede

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit(filialSchema, d, () => saveFilial(filial?.id, d), (filiais) => {
      const salva = filiais.find((f) => f.nome === d.nome.trim())
      if (sede || !salva || salva.lat !== 0 || salva.lng !== 0) toast.success(filial ? "Filial atualizada" : `Filial ${d.nome} cadastrada`)
      else toast.warning("Filial salva, mas não achamos o endereço no mapa. Confira rua, bairro, cidade e CEP.")
      // Os membros mostram o nome da filial: recarrega do servidor se ele mudou.
      if (filial && filial.nome !== d.nome.trim()) router.refresh()
      onClose()
    })
  }

  const campo = (k: keyof Endereco, label: string, extra?: React.ComponentProps<typeof Input>) => (
    <Field>
      <FieldLabel htmlFor={`f-${k}`}>{label}</FieldLabel>
      <Input {...invalid(`endereco.${k}`)} id={`f-${k}`} value={d.endereco[k]} onChange={(e) => setEnd(k, e.target.value)} {...extra} />
      <FieldError>{errors[`endereco.${k}`]}</FieldError>
    </Field>
  )

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{filial ? `Editar ${filial.nome}` : "Nova filial"}</DialogTitle>
          <DialogDescription>{sede ? "A sede é a própria igreja." : "O endereço põe a filial no mapa."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="f-nome">Nome</FieldLabel>
              <Input {...invalid("nome")} id="f-nome" placeholder="Ex.: Filial Cabo Frio" value={d.nome} onChange={(e) => set("nome", e.target.value)} />
              <FieldError>{errors.nome}</FieldError>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="f-dir">Dirigente</FieldLabel>
                <Input {...invalid("dirigente")} id="f-dir" placeholder="Pastor ou dirigente" value={d.dirigente} onChange={(e) => set("dirigente", e.target.value)} />
                <FieldError>{errors.dirigente}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="f-tel">Telefone</FieldLabel>
                <Input {...invalid("telefone")} id="f-tel" inputMode="tel" value={d.telefone} onChange={(e) => set("telefone", e.target.value)} />
                <FieldError>{errors.telefone}</FieldError>
              </Field>
            </div>
            {sede ? (
              <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">O endereço da sede é o da igreja, na aba Igreja.</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
                  {campo("rua", "Rua")}
                  {campo("numero", "Número")}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {campo("bairro", "Bairro")}
                  {campo("cep", "CEP", { inputMode: "numeric", placeholder: "00000-000" })}
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr_80px]">
                  {campo("cidade", "Cidade")}
                  {campo("uf", "UF", { maxLength: 2 })}
                </div>
                <PinPicker endereco={d.endereco} lat={d.lat} lng={d.lng} onChange={(lat, lng) => setD((s) => ({ ...s, lat, lng }))} />
              </>
            )}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function FiliaisSettings() {
  const router = useRouter()
  const filiais = useApp((s) => s.church.filiais)
  const members = useApp((s) => s.members)
  const cells = useApp((s) => s.cells)
  const removeFilial = useApp((s) => s.removeFilial)
  const [editando, setEditando] = React.useState<Filial | "nova" | null>(null)

  const conta = (nome: string, sede: boolean) => ({
    membros: members.filter((m) => m.congregacao === nome || (sede && !m.congregacao)).length,
    celulas: cells.filter((c) => c.congregacao === nome || (sede && !c.congregacao)).length,
  })

  async function excluir(f: Filial) {
    if (!confirm(`Excluir ${f.nome}? Os membros e as células dela passam para a sede.`)) return
    if (await notify(removeFilial(f.id), `${f.nome} excluída`)) router.refresh()
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Secretaria e pastor podem ficar restritos a uma filial em Usuários e acesso: aí só veem os membros, as células e as
          visitas dela.
        </p>
        <Button onClick={() => setEditando("nova")}><Plus /> Nova filial</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filiais.map((f) => {
          const n = conta(f.nome, f.sede)
          const noMapa = f.lat !== 0 || f.lng !== 0
          return (
            <Card key={f.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="size-4 text-primary" /> {f.nome}
                  {f.sede && <Badge>Sede</Badge>}
                </CardTitle>
                <CardDescription>{n.membros} membros · {n.celulas} células</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="flex items-center gap-2"><User className="size-4 text-muted-foreground" /> {f.dirigente || "Dirigente não informado"}</p>
                {f.telefone && <p className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" /> {f.telefone}</p>}
                <p className="flex items-start gap-2">
                  {noMapa ? <MapPin className="mt-0.5 size-4 shrink-0 text-success" /> : <MapPinOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                  <span>
                    {f.endereco.rua ? `${f.endereco.rua}, ${f.endereco.numero} · ${f.endereco.bairro} · ${f.endereco.cidade}/${f.endereco.uf}` : "Sem endereço"}
                    {!noMapa && <span className="block text-xs text-muted-foreground">Fora do mapa</span>}
                  </span>
                </p>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setEditando(f)}><Pencil /> Editar</Button>
                  {!f.sede && <Button variant="ghost" size="sm" onClick={() => excluir(f)}><Trash2 /> Excluir</Button>}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      {editando && <FilialDialog filial={editando === "nova" ? undefined : editando} onClose={() => setEditando(null)} />}
    </>
  )
}
