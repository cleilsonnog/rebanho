"use client"

import * as React from "react"
import { toast } from "sonner"

import { MembersMultiPicker } from "@/components/app/members-multi-picker"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useFormAction } from "@/hooks/use-form-action"
import { useApp } from "@/lib/store"
import type { School, SchoolClass } from "@/lib/types"
import { schoolClassSchema, schoolSchema } from "@/lib/validations"

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void }

export function SchoolFormDialog({ open, onOpenChange, school }: DialogProps & { school?: School }) {
  const saveSchool = useApp((s) => s.saveSchool)
  const { errors, pending, submit, invalid } = useFormAction()
  const [d, setD] = React.useState({ nome: school?.nome ?? "", descricao: school?.descricao ?? "" })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit(schoolSchema, d, () => saveSchool(school?.id, d), (saved) => {
      toast.success(school ? "Escola atualizada" : `${saved.nome} criada`)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{school ? `Editar ${school.nome}` : "Nova escola"}</DialogTitle>
          <DialogDescription>Ex.: Escola de Batismo, Escola de Discípulos, Escola de Líderes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="e-nome">Nome</FieldLabel>
              <Input {...invalid("nome")} id="e-nome" autoFocus value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} />
              <FieldError>{errors.nome}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="e-desc">Descrição</FieldLabel>
              <Textarea
                {...invalid("descricao")}
                id="e-desc"
                rows={3}
                placeholder="Para quem é, quantas aulas, o que é estudado…"
                value={d.descricao}
                onChange={(e) => setD({ ...d, descricao: e.target.value })}
              />
              <FieldError>{errors.descricao}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Salvando…" : school ? "Salvar alterações" : "Criar escola"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SchoolClassFormDialog({
  open,
  onOpenChange,
  turma,
  escolaId,
  onSaved,
}: DialogProps & { turma?: SchoolClass; escolaId?: string; onSaved?: (t: SchoolClass) => void }) {
  const schools = useApp((s) => s.schools)
  const saveSchoolClass = useApp((s) => s.saveSchoolClass)
  const { errors, pending, submit, invalid } = useFormAction()
  const [d, setD] = React.useState({
    escolaId: turma?.escolaId ?? escolaId ?? schools[0]?.id ?? "",
    nome: turma?.nome ?? "",
    inicio: turma?.inicio ?? "",
    horario: turma?.horario ?? "",
    local: turma?.local ?? "",
    professores: turma?.professores.map((p) => p.id) ?? [],
    alunos: turma?.alunos.map((a) => a.id) ?? [],
  })
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((s) => ({ ...s, [k]: v }))

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit(schoolClassSchema, d, () => saveSchoolClass(turma?.id, d), (saved) => {
      toast.success(turma ? "Turma atualizada" : `Turma ${saved.nome} criada`)
      onOpenChange(false)
      onSaved?.(saved)
    })
  }

  const saem = turma?.alunos.filter((a) => !d.alunos.includes(a.id)) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{turma ? `Editar turma ${turma.nome}` : "Nova turma"}</DialogTitle>
          <DialogDescription>Professores, alunos e quando a turma se reúne.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Escola</FieldLabel>
                <Select value={d.escolaId} onValueChange={(v) => set("escolaId", v)}>
                  <SelectTrigger {...invalid("escolaId")} className="w-full"><SelectValue placeholder="Escolha" /></SelectTrigger>
                  <SelectContent>{schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
                <FieldError>{errors.escolaId}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="t-nome">Nome da turma</FieldLabel>
                <Input {...invalid("nome")} id="t-nome" placeholder="Ex.: Novembro/2026" value={d.nome} onChange={(e) => set("nome", e.target.value)} />
                <FieldError>{errors.nome}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="t-inicio">Início</FieldLabel>
                <Input {...invalid("inicio")} id="t-inicio" type="date" value={d.inicio} onChange={(e) => set("inicio", e.target.value)} />
                <FieldError>{errors.inicio}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="t-horario">Dia e horário</FieldLabel>
                <Input {...invalid("horario")} id="t-horario" placeholder="Ex.: Domingos, 9h" value={d.horario} onChange={(e) => set("horario", e.target.value)} />
                <FieldError>{errors.horario}</FieldError>
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="t-local">Local</FieldLabel>
                <Input {...invalid("local")} id="t-local" placeholder="Ex.: Sala 3 do templo" value={d.local} onChange={(e) => set("local", e.target.value)} />
                <FieldError>{errors.local}</FieldError>
              </Field>
            </div>

            <Field>
              <FieldLabel>Professores</FieldLabel>
              <FieldDescription>
                Se o professor tiver acesso ao sistema (ligado ao cadastro de membro dele), ele lança a presença desta turma.
              </FieldDescription>
              <MembersMultiPicker value={d.professores} onChange={(ids) => set("professores", ids)} max={5} exclude={d.alunos} />
              <FieldError>{errors.professores}</FieldError>
            </Field>
            <Field>
              <FieldLabel>Alunos ({d.alunos.length})</FieldLabel>
              <MembersMultiPicker value={d.alunos} onChange={(ids) => set("alunos", ids)} exclude={d.professores} addLabel="Adicionar aluno" />
              <FieldError>{errors.alunos}</FieldError>
              {saem.length > 0 && (
                <FieldDescription className="text-destructive">
                  {saem.map((a) => a.nome).join(", ")} {saem.length === 1 ? "sai" : "saem"} da turma e {saem.length === 1 ? "perde" : "perdem"} a presença registrada.
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Salvando…" : turma ? "Salvar alterações" : "Criar turma"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
