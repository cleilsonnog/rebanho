"use client"

import * as React from "react"
import { X } from "lucide-react"
import { toast } from "sonner"

import { MemberAvatar } from "@/components/app/member-avatar"
import { MembersMultiPicker } from "@/components/app/members-multi-picker"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFormAction } from "@/hooks/use-form-action"
import { PARENTESCO_LABEL, age } from "@/lib/format"
import { useApp } from "@/lib/store"
import type { Member, Parentesco } from "@/lib/types"
import { familySchema } from "@/lib/validations"

type Pessoa = { id: string; parentesco: Parentesco }

const NOVA = "nova"

/** "Família Silva" pelo último sobrenome. */
export const nomeDaFamilia = (nome: string) => `Família ${nome.trim().split(/\s+/).at(-1) ?? ""}`.trim()

/** Parentesco sugerido para quem entra: o primeiro é o responsável; menor de idade, filho; casado, cônjuge. */
function sugerir(m: Member, primeiro: boolean): Parentesco {
  if (primeiro) return "responsavel"
  if (age(m.nascimento) < 18) return "filho"
  return m.estadoCivil === "casado" ? "conjuge" : "outro"
}

/**
 * Monta ou edita uma família. Aberto pela ficha de alguém sem família (`membroId`), deixa escolher entre criar
 * uma família nova e incluir a pessoa numa existente.
 */
export function FamilyFormDialog({
  open,
  onOpenChange,
  familiaId,
  membroId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  familiaId?: string
  membroId?: string
}) {
  const members = useApp((s) => s.members)
  const families = useApp((s) => s.families)
  const saveFamily = useApp((s) => s.saveFamily)
  const { errors, pending, submit, invalid } = useFormAction()
  const byId = React.useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  function inicial(id: string | undefined) {
    const f = families.find((x) => x.id === id)
    const atuais: Pessoa[] = members.filter((m) => f && m.familiaId === f.id).map((m) => ({ id: m.id, parentesco: m.parentesco ?? "outro" }))
    const membro = membroId ? byId.get(membroId) : undefined
    const com = membro && !atuais.some((p) => p.id === membro.id) ? [...atuais, { id: membro.id, parentesco: sugerir(membro, atuais.length === 0) }] : atuais
    return { escolha: f?.id ?? NOVA, nome: f?.nome ?? (membro ? nomeDaFamilia(membro.nome) : ""), membros: com }
  }

  const [d, setD] = React.useState(() => inicial(familiaId))
  const editando = familiaId !== undefined
  const id = d.escolha === NOVA ? undefined : d.escolha

  function adicionar(ids: string[]) {
    const novos = ids.filter((x) => !d.membros.some((p) => p.id === x))
    setD((s) => ({ ...s, membros: [...s.membros, ...novos.map((x, i) => ({ id: x, parentesco: sugerir(byId.get(x)!, s.membros.length + i === 0) }))] }))
  }
  const setParentesco = (pid: string, parentesco: Parentesco) =>
    setD((s) => ({ ...s, membros: s.membros.map((p) => (p.id === pid ? { ...p, parentesco } : p)) }))
  const tirar = (pid: string) => setD((s) => ({ ...s, membros: s.membros.filter((p) => p.id !== pid) }))

  // Quem já é de outra família muda para esta.
  const mudam = d.membros.map((p) => byId.get(p.id)).filter((m): m is Member => !!m?.familiaId && m.familiaId !== id)
  const nomeFamilia = (fid: string) => families.find((f) => f.id === fid)?.nome ?? "outra família"

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valor = { nome: d.nome, membros: d.membros }
    submit(familySchema, valor, () => saveFamily(id, valor), (f) => {
      toast.success(id ? `${f.nome} atualizada` : `${f.nome} criada`)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editando ? `Editar ${d.nome || "família"}` : "Família"}</DialogTitle>
          <DialogDescription>Ligue casal, filhos e outros parentes que fazem parte da igreja.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            {!editando && families.length > 0 && (
              <Field>
                <FieldLabel>Incluir em</FieldLabel>
                <Select value={d.escolha} onValueChange={(v) => setD(inicial(v === NOVA ? undefined : v))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NOVA}>Nova família</SelectItem>
                    {families.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="f-nome">Nome da família</FieldLabel>
              <Input {...invalid("nome")} id="f-nome" placeholder="Ex.: Família Silva" value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} />
              <FieldError>{errors.nome}</FieldError>
            </Field>
            <Field>
              <FieldLabel>Pessoas ({d.membros.length})</FieldLabel>
              <div className="space-y-2">
                {d.membros.map((p) => {
                  const m = byId.get(p.id)
                  if (!m) return null
                  return (
                    <div key={p.id} className="flex items-center gap-2 rounded-lg border p-2">
                      <MemberAvatar nome={m.nome} className="size-8 text-xs" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">{age(m.nascimento)} anos</p>
                      </div>
                      <Select value={p.parentesco} onValueChange={(v) => setParentesco(p.id, v as Parentesco)}>
                        <SelectTrigger className="w-36" aria-label={`Parentesco de ${m.nome}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PARENTESCO_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Tirar ${m.nome} da família`} onClick={() => tirar(p.id)}>
                        <X />
                      </Button>
                    </div>
                  )
                })}
              </div>
              <MembersMultiPicker
                value={[]}
                onChange={adicionar}
                exclude={d.membros.map((p) => p.id)}
                hint={(x) => (byId.get(x)?.familiaId ? nomeFamilia(byId.get(x)!.familiaId!) : undefined)}
                addLabel="Adicionar pessoa"
              />
              <FieldError>{errors.membros}</FieldError>
              {mudam.length > 0 && (
                <FieldDescription className="text-amber-700 dark:text-amber-400">
                  {mudam.map((m) => `${m.nome} sai da ${nomeFamilia(m.familiaId!)}`).join("; ")}.
                </FieldDescription>
              )}
              <FieldDescription>Quem tirar da lista continua cadastrado, só deixa de fazer parte da família.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Salvando…" : id ? "Salvar família" : "Criar família"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
