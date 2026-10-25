"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useFormAction } from "@/hooks/use-form-action"
import { STATUS_LABEL, TODAY } from "@/lib/format"
import { CARGOS, MINISTERIOS } from "@/lib/seed"
import { canWrite } from "@/lib/permissions"
import { useApp } from "@/lib/store"
import type { Member } from "@/lib/types"
import { memberSchema } from "@/lib/validations"

type Draft = Omit<Member, "id">

const empty = (congregacao: string, cidade: string, uf: string): Draft => ({
  nome: "",
  sexo: "F",
  nascimento: "",
  telefone: "",
  email: "",
  estadoCivil: "solteiro",
  endereco: { rua: "", numero: "", bairro: "", cidade, uf, cep: "" },
  lat: 0,
  lng: 0,
  congregacao,
  cargo: "Membro",
  ministerios: [],
  status: "ativo",
  batizado: false,
  membroDesde: TODAY.toISOString().slice(0, 10),
})

export function MemberForm({ member }: { member?: Member }) {
  const router = useRouter()
  const congregacoes = useApp((s) => s.church.congregacoes)
  const cidadeIgreja = useApp((s) => s.church.endereco)
  const members = useApp((s) => s.members)
  // Sugestões de bairro: os que já aparecem no cadastro desta igreja.
  const bairros = React.useMemo(() => [...new Set(members.map((m) => m.endereco.bairro).filter(Boolean))].sort(), [members])
  const addMember = useApp((s) => s.addMember)
  const updateMember = useApp((s) => s.updateMember)
  const { errors, pending, submit, invalid } = useFormAction()
  const pode = useApp((s) => canWrite(s.me.papel, "membros"))
  const [d, setD] = React.useState<Draft>(() => {
    if (!member) return empty(congregacoes[0] ?? "", cidadeIgreja.cidade, cidadeIgreja.uf)
    const rest: Partial<Member> = { ...member }
    delete rest.id
    return rest as Draft
  })

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }))
  const setEnd = (k: keyof Draft["endereco"], v: string) => setD((s) => ({ ...s, endereco: { ...s.endereco, [k]: v } }))

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    // A posição no mapa é calculada no servidor pelo bairro (lib/actions/members.ts).
    const data = d
    submit(
      memberSchema,
      data,
      () => (member ? updateMember(member.id, data) : addMember(data)),
      (saved) => {
        toast.success(member ? "Ficha atualizada" : `${saved.nome} cadastrado(a)`)
        router.push(`/app/membros/${saved.id}`)
      }
    )
  }

  if (!pode)
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Sua função não permite cadastrar ou editar membros.</CardContent>
      </Card>
    )

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="nome">Nome completo</FieldLabel>
                <Input {...invalid("nome")} id="nome" required value={d.nome} onChange={(e) => set("nome", e.target.value)} />
                <FieldError>{errors["nome"]}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="nasc">Data de nascimento</FieldLabel>
                <Input {...invalid("nascimento")} id="nasc" type="date" required value={d.nascimento} onChange={(e) => set("nascimento", e.target.value)} />
                <FieldError>{errors["nascimento"]}</FieldError>
              </Field>
              <Field>
                <FieldLabel>Sexo</FieldLabel>
                <Select value={d.sexo} onValueChange={(v) => set("sexo", v as Draft["sexo"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="M">Masculino</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="tel">Telefone / WhatsApp</FieldLabel>
                <Input {...invalid("telefone")} id="tel" required inputMode="tel" placeholder="(62) 99999-9999" value={d.telefone} onChange={(e) => set("telefone", e.target.value)} />
                <FieldError>{errors["telefone"]}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="email">E-mail</FieldLabel>
                <Input {...invalid("email")} id="email" type="email" value={d.email} onChange={(e) => set("email", e.target.value)} />
                <FieldError>{errors["email"]}</FieldError>
              </Field>
              <Field>
                <FieldLabel>Estado civil</FieldLabel>
                <Select value={d.estadoCivil} onValueChange={(v) => set("estadoCivil", v as Draft["estadoCivil"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                    <SelectItem value="casado">Casado(a)</SelectItem>
                    <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                    <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
            <CardDescription>Usado no mapa de membros e no planejamento de visitas.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 sm:grid-cols-6">
              <Field className="sm:col-span-4">
                <FieldLabel htmlFor="rua">Rua</FieldLabel>
                <Input {...invalid("endereco.rua")} id="rua" value={d.endereco.rua} onChange={(e) => setEnd("rua", e.target.value)} />
                <FieldError>{errors["endereco.rua"]}</FieldError>
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="num">Número</FieldLabel>
                <Input {...invalid("endereco.numero")} id="num" value={d.endereco.numero} onChange={(e) => setEnd("numero", e.target.value)} />
                <FieldError>{errors["endereco.numero"]}</FieldError>
              </Field>
              <Field className="sm:col-span-3">
                <FieldLabel htmlFor="bairro">Bairro</FieldLabel>
                <Input {...invalid("endereco.bairro")} id="bairro" list="bairros" value={d.endereco.bairro} onChange={(e) => setEnd("bairro", e.target.value)} />
                <datalist id="bairros">{bairros.map((b) => <option key={b} value={b} />)}</datalist>
                <FieldError>{errors["endereco.bairro"]}</FieldError>
              </Field>
              <Field className="sm:col-span-3">
                <FieldLabel htmlFor="cep">CEP</FieldLabel>
                <Input {...invalid("endereco.cep")} id="cep" value={d.endereco.cep} onChange={(e) => setEnd("cep", e.target.value)} />
                <FieldError>{errors["endereco.cep"]}</FieldError>
              </Field>
              <Field className="sm:col-span-4">
                <FieldLabel htmlFor="cidade">Cidade</FieldLabel>
                <Input {...invalid("endereco.cidade")} id="cidade" value={d.endereco.cidade} onChange={(e) => setEnd("cidade", e.target.value)} />
                <FieldError>{errors["endereco.cidade"]}</FieldError>
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="uf">UF</FieldLabel>
                <Input {...invalid("endereco.uf")} id="uf" maxLength={2} value={d.endereco.uf} onChange={(e) => setEnd("uf", e.target.value.toUpperCase())} />
                <FieldError>{errors["endereco.uf"]}</FieldError>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
          <CardContent>
            <Textarea {...invalid("observacoes")} rows={4} value={d.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} placeholder="Informações pastorais, família, necessidades…" />
            <FieldError className="mt-2">{errors.observacoes}</FieldError>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Vida na igreja</CardTitle></CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>Situação</FieldLabel>
                <Select value={d.status} onValueChange={(v) => set("status", v as Draft["status"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Congregação</FieldLabel>
                <Select value={d.congregacao} onValueChange={(v) => set("congregacao", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {congregacoes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Cargo</FieldLabel>
                <Select value={d.cargo} onValueChange={(v) => set("cargo", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CARGOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="desde">Membro desde</FieldLabel>
                <Input {...invalid("membroDesde")} id="desde" type="date" value={d.membroDesde} onChange={(e) => set("membroDesde", e.target.value)} />
                <FieldError>{errors["membroDesde"]}</FieldError>
              </Field>
              <Field orientation="horizontal" className="justify-between">
                <FieldLabel htmlFor="batizado">Batizado(a)</FieldLabel>
                <Switch id="batizado" checked={d.batizado} onCheckedChange={(v) => set("batizado", v)} />
              </Field>
              {d.batizado && (
                <Field>
                  <FieldLabel htmlFor="dtbat">Data do batismo</FieldLabel>
                  <Input {...invalid("dataBatismo")} id="dtbat" type="date" value={d.dataBatismo ?? ""} onChange={(e) => set("dataBatismo", e.target.value)} />
                  <FieldError>{errors["dataBatismo"]}</FieldError>
                </Field>
              )}
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ministérios</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {MINISTERIOS.map((min) => (
              <label key={min} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={d.ministerios.includes(min)}
                  onCheckedChange={(c) =>
                    set("ministerios", c ? [...d.ministerios, min] : d.ministerios.filter((x) => x !== min))
                  }
                />
                {min}
              </label>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? "Salvando…" : member ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </div>
      </div>
    </form>
  )
}
