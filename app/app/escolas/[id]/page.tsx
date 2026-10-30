"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Award, ClipboardCheck, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { MemberAvatar } from "@/components/app/member-avatar"
import { SchoolClassFormDialog } from "@/components/app/school-forms"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { notify, useFormAction } from "@/hooks/use-form-action"
import { SITUACAO_ALUNO_LABEL, TODAY, formatDate } from "@/lib/format"
import { canWrite } from "@/lib/permissions"
import { useApp } from "@/lib/store"
import type { SchoolClass, SchoolLesson, SituacaoAluno } from "@/lib/types"
import { SITUACOES_ALUNO, schoolLessonSchema } from "@/lib/validations"

const hoje = TODAY.toISOString().slice(0, 10)

function AulaForm({
  turma,
  data,
  setData,
  aula,
  pode,
}: {
  turma: SchoolClass
  data: string
  setData: (d: string) => void
  aula?: SchoolLesson
  pode: boolean
}) {
  const saveSchoolLesson = useApp((s) => s.saveSchoolLesson)
  const { errors, pending, submit, invalid } = useFormAction()
  const [tema, setTema] = React.useState(aula?.tema ?? "")
  const [presentes, setPresentes] = React.useState<string[]>(aula?.presentes ?? [])
  // Quem desistiu sai da chamada, a não ser que já tenha presença nesta aula.
  const alunos = turma.alunos.filter((a) => a.situacao !== "desistiu" || presentes.includes(a.id))

  const marcar = (id: string, sim: boolean) => setPresentes((p) => (sim ? [...p, id] : p.filter((x) => x !== id)))

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const a = { turmaId: turma.id, data, tema, presentes }
    submit(schoolLessonSchema, a, () => saveSchoolLesson(a), () => toast.success(`Aula de ${formatDate(data)} salva`))
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader className="flex-row flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><ClipboardCheck className="size-4 text-primary" /> Aula</CardTitle>
            <CardDescription>{aula ? "Aula já lançada. Você pode corrigir e salvar de novo." : "Marque quem veio à aula."}</CardDescription>
          </div>
          <Field className="w-44">
            <FieldLabel htmlFor="a-data">Data</FieldLabel>
            <Input {...invalid("data")} id="a-data" type="date" max={hoje} value={data} onChange={(e) => e.target.value && setData(e.target.value)} />
            <FieldError>{errors.data}</FieldError>
          </Field>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field>
            <FieldLabel htmlFor="a-tema">Tema da aula</FieldLabel>
            <Input {...invalid("tema")} id="a-tema" disabled={!pode} placeholder="Ex.: O significado do batismo" value={tema} onChange={(e) => setTema(e.target.value)} />
            <FieldError>{errors.tema}</FieldError>
          </Field>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Presença · {presentes.length} de {alunos.length}</p>
              {pode && alunos.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPresentes(presentes.length === alunos.length ? [] : alunos.map((a) => a.id))}>
                  {presentes.length === alunos.length ? "Desmarcar todos" : "Marcar todos"}
                </Button>
              )}
            </div>
            <div className="divide-y rounded-lg border">
              {alunos.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhum aluno na turma ainda.</p>}
              {alunos.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                  <Checkbox checked={presentes.includes(a.id)} disabled={!pode} onCheckedChange={(c) => marcar(a.id, c === true)} />
                  <MemberAvatar nome={a.nome} className="size-7 text-[10px]" />
                  <span className="min-w-0 flex-1 truncate text-sm">{a.nome}</span>
                </label>
              ))}
            </div>
          </div>
          {pode && (
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar aula"}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  )
}

export default function TurmaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const turma = useApp((s) => s.schoolClasses.find((t) => t.id === id))
  const escola = useApp((s) => s.schools.find((e) => e.id === turma?.escolaId))
  const todasAulas = useApp((s) => s.schoolLessons)
  const me = useApp((s) => s.me)
  const removeSchoolClass = useApp((s) => s.removeSchoolClass)
  const removeSchoolLesson = useApp((s) => s.removeSchoolLesson)
  const setEnrollment = useApp((s) => s.setEnrollment)
  const aulas = React.useMemo(() => todasAulas.filter((a) => a.turmaId === id), [todasAulas, id])
  const [data, setData] = React.useState(hoje)
  const [editando, setEditando] = React.useState(false)

  if (!turma)
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Turma não encontrada.</p>
        <Button variant="outline" className="mt-4" asChild><Link href="/app/escolas">Voltar</Link></Button>
      </div>
    )

  const podeTurma = canWrite(me.papel, "escolas") && !me.congregacao
  // Presença: quem cuida das escolas, ou o professor desta turma (o servidor confere de novo).
  const professor = Boolean(me.memberId && turma.professores.some((p) => p.id === me.memberId))
  const podeAula = canWrite(me.papel, "aulas") && (canWrite(me.papel, "escolas") || professor)
  const podeCertificado = canWrite(me.papel, "certificados")
  const aula = aulas.find((a) => a.data === data)
  const frequencia = (alunoId: string) =>
    aulas.length ? Math.round((aulas.filter((a) => a.presentes.includes(alunoId)).length / aulas.length) * 100) : null
  const concluiram = turma.alunos.filter((a) => a.situacao === "concluido")
  const certificados = new URLSearchParams({
    membros: concluiram.map((a) => a.id).join(","),
    tipo: "Conclusão de curso",
    detalhe: escola?.nome ?? "",
  })

  async function excluir() {
    if (!confirm(`Excluir a turma ${turma!.nome} com todas as aulas e presenças?`)) return
    if (await notify(removeSchoolClass(turma!.id), "Turma excluída")) router.push("/app/escolas")
  }

  function mudarSituacao(membroId: string, situacao: SituacaoAluno) {
    notify(setEnrollment({ turmaId: turma!.id, membroId, situacao }), "Situação atualizada")
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link href="/app/escolas"><ArrowLeft /> Escolas</Link>
      </Button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">{escola?.nome}</p>
          <h1 className="text-2xl font-semibold md:text-3xl">Turma {turma.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[turma.inicio && `Início ${formatDate(turma.inicio)}`, turma.horario, turma.local].filter(Boolean).join(" · ") || "Horário a definir"}
            {" · "}Professor: {turma.professores.map((p) => p.nome).join(" e ") || "—"}
          </p>
        </div>
        {podeTurma && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={excluir}><Trash2 /> Excluir</Button>
            <Button onClick={() => setEditando(true)}><Pencil /> Editar turma</Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <AulaForm key={`${data}:${aula?.id ?? ""}`} turma={turma} data={data} setData={setData} aula={aula} pode={podeAula} />

          <Card>
            <CardHeader><CardTitle>Aulas lançadas ({aulas.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {aulas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma aula lançada.</p>}
              {aulas.map((a) => (
                <div key={a.id} className="group flex flex-wrap items-center gap-2 rounded-xl border p-3">
                  <button type="button" className="font-medium hover:underline" onClick={() => setData(a.data)}>{formatDate(a.data)}</button>
                  {a.tema && <span className="text-sm text-muted-foreground">{a.tema}</span>}
                  <Badge variant="secondary">{a.presentes.length} presentes</Badge>
                  {a.data === data && <Badge>aberta acima</Badge>}
                  {podeAula && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label="Excluir aula"
                      onClick={() => confirm("Excluir esta aula?") && notify(removeSchoolLesson(a.id), "Aula excluída")}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader className="flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Alunos ({turma.alunos.length})</CardTitle>
              <CardDescription>Frequência nas {aulas.length} aula(s) lançadas.</CardDescription>
            </div>
            {podeCertificado && concluiram.length > 0 && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/app/certificados?${certificados}`}><Award /> Certificados ({concluiram.length})</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="divide-y p-0">
            {turma.alunos.length === 0 && <p className="px-6 pb-6 text-sm text-muted-foreground">Nenhum aluno na turma ainda.</p>}
            {turma.alunos.map((a) => {
              const f = frequencia(a.id)
              return (
                <div key={a.id} className="flex items-center gap-3 px-6 py-2.5">
                  <MemberAvatar nome={a.nome} className="size-8 text-[11px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {f === null ? "Sem aulas ainda" : `${f}% de presença`}
                      {a.concluidoEm && ` · concluiu em ${formatDate(a.concluidoEm)}`}
                    </p>
                  </div>
                  {podeTurma ? (
                    <Select value={a.situacao} onValueChange={(v) => mudarSituacao(a.id, v as SituacaoAluno)}>
                      <SelectTrigger size="sm" className="w-32" aria-label={`Situação de ${a.nome}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SITUACOES_ALUNO.map((s) => <SelectItem key={s} value={s}>{SITUACAO_ALUNO_LABEL[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={a.situacao === "concluido" ? "default" : "secondary"}>{SITUACAO_ALUNO_LABEL[a.situacao]}</Badge>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <SchoolClassFormDialog key={String(editando)} open={editando && podeTurma} onOpenChange={setEditando} turma={turma} />
    </>
  )
}
