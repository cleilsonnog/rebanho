"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { AccessGuard } from "@/components/app/access-guard"
import { CellStudyCard, PrintStudyButton } from "@/components/app/cell-study"
import { PageHeader } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { notify, useFormAction } from "@/hooks/use-form-action"
import { TODAY, inicioDaSemana, periodoDaSemana } from "@/lib/format"
import { canWrite } from "@/lib/permissions"
import { useApp } from "@/lib/store"
import type { CellStudy } from "@/lib/types"
import { cellStudySchema } from "@/lib/validations"

const estaSemana = inicioDaSemana(TODAY.toISOString().slice(0, 10))

function EstudoForm({ semana, setSemana, study }: { semana: string; setSemana: (s: string) => void; study?: CellStudy }) {
  const saveCellStudy = useApp((s) => s.saveCellStudy)
  const { errors, pending, submit, invalid } = useFormAction()
  const [tema, setTema] = React.useState(study?.tema ?? "")
  const [referencia, setReferencia] = React.useState(study?.referencia ?? "")
  const [texto, setTexto] = React.useState(study?.texto ?? "")

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const estudo = { semana, tema, referencia, texto }
    submit(cellStudySchema, estudo, () => saveCellStudy(estudo), () =>
      toast.success(study ? "Estudo atualizado" : `Estudo publicado para a semana de ${periodoDaSemana(semana)}`)
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{study ? "Editar estudo" : "Publicar estudo"}</CardTitle>
        <CardDescription>Aparece na reunião de todas as células nessa semana.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="e-semana">Semana</FieldLabel>
              <Input
                {...invalid("semana")}
                id="e-semana"
                type="date"
                className="w-48"
                value={semana}
                onChange={(e) => e.target.value && setSemana(inicioDaSemana(e.target.value))}
              />
              <FieldDescription>De {periodoDaSemana(semana)} (segunda a domingo).</FieldDescription>
              <FieldError>{errors.semana}</FieldError>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="e-tema">Tema</FieldLabel>
                <Input {...invalid("tema")} id="e-tema" placeholder="Ex.: O bom pastor" value={tema} onChange={(e) => setTema(e.target.value)} />
                <FieldError>{errors.tema}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="e-ref">Texto bíblico</FieldLabel>
                <Input {...invalid("referencia")} id="e-ref" placeholder="Ex.: João 10:1-18" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
                <FieldError>{errors.referencia}</FieldError>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="e-texto">Estudo</FieldLabel>
              <Textarea
                {...invalid("texto")}
                id="e-texto"
                rows={14}
                placeholder={"Quebra-gelo, leitura, perguntas para a conversa, desafio da semana…"}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
              <FieldError>{errors.texto}</FieldError>
            </Field>
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>{pending ? "Salvando…" : study ? "Salvar alterações" : "Publicar estudo"}</Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

function EstudosPageContent() {
  const studies = useApp((s) => s.cellStudies)
  const removeCellStudy = useApp((s) => s.removeCellStudy)
  const pode = useApp((s) => canWrite(s.me.papel, "estudos"))
  const [semana, setSemana] = React.useState(estaSemana)
  const study = studies.find((s) => s.semana === semana)

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link href="/app/celulas"><ArrowLeft /> Células</Link>
      </Button>
      <PageHeader title="Estudo da semana" description="O pastor ou a secretaria publica uma vez, e todas as células recebem." />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {pode ? (
          <EstudoForm key={`${semana}:${study?.id ?? ""}`} semana={semana} setSemana={setSemana} study={study} />
        ) : study ? (
          <CellStudyCard key={study.id} study={study} defaultOpen className="self-start" />
        ) : (
          <Card className="self-start">
            <CardContent className="py-12 text-center text-muted-foreground">Nenhum estudo publicado para a semana de {periodoDaSemana(semana)}.</CardContent>
          </Card>
        )}

        <Card className="self-start">
          <CardHeader><CardTitle>Estudos publicados</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {studies.length === 0 && <p className="text-sm text-muted-foreground">Nenhum estudo publicado ainda.</p>}
            {studies.map((s) => (
              <div key={s.id} className={`group flex items-center gap-2 rounded-lg border p-3 ${s.semana === semana ? "border-primary/50 bg-primary/5" : ""}`}>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSemana(s.semana)}>
                  <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {periodoDaSemana(s.semana)}
                    {s.semana === estaSemana && <Badge>Esta semana</Badge>}
                    {s.semana > estaSemana && <Badge variant="outline">Programado</Badge>}
                  </span>
                  <span className="block truncate font-medium">{s.tema}</span>
                  {s.referencia && <span className="block truncate text-xs text-muted-foreground">{s.referencia}</span>}
                </button>
                <PrintStudyButton study={s} iconOnly />
                {pode && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label="Excluir estudo"
                    onClick={() => confirm(`Excluir o estudo "${s.tema}"?`) && notify(removeCellStudy(s.id), "Estudo excluído")}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default function EstudosPage() {
  return (
    <AccessGuard area="celulas" title="Estudo da semana">
      <EstudosPageContent />
    </AccessGuard>
  )
}
