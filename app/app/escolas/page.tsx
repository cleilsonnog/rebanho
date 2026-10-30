"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarCheck, GraduationCap, MoreHorizontal, Pencil, Plus, School as SchoolIcon, Trash2, Users } from "lucide-react"

import { PageHeader, StatCard } from "@/components/app/page-header"
import { SchoolClassFormDialog, SchoolFormDialog } from "@/components/app/school-forms"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { notify } from "@/hooks/use-form-action"
import { formatDate } from "@/lib/format"
import { canWrite } from "@/lib/permissions"
import { useApp } from "@/lib/store"
import type { School } from "@/lib/types"

export default function EscolasPage() {
  const router = useRouter()
  const schools = useApp((s) => s.schools)
  const turmas = useApp((s) => s.schoolClasses)
  const aulas = useApp((s) => s.schoolLessons)
  const me = useApp((s) => s.me)
  const removeSchool = useApp((s) => s.removeSchool)
  // Quem é de uma filial não monta escola nem turma: elas valem para a igreja toda.
  const pode = canWrite(me.papel, "escolas") && !me.congregacao
  const [escolaForm, setEscolaForm] = React.useState<{ open: boolean; school?: School }>({ open: false })
  const [turmaForm, setTurmaForm] = React.useState<{ open: boolean; escolaId?: string }>({ open: false })

  const cursando = turmas.reduce((a, t) => a + t.alunos.filter((x) => x.situacao === "cursando").length, 0)
  const ano = new Date().getFullYear().toString()
  const concluiramAno = turmas.reduce((a, t) => a + t.alunos.filter((x) => x.concluidoEm?.startsWith(ano)).length, 0)
  const mes = new Date().toISOString().slice(0, 7)
  const aulasMes = aulas.filter((a) => a.data.startsWith(mes)).length

  async function excluir(s: School) {
    const n = turmas.filter((t) => t.escolaId === s.id).length
    if (!confirm(`Excluir ${s.nome}${n ? ` e as ${n} turma(s) dela, com aulas e presenças` : ""}? Os certificados já emitidos continuam.`)) return
    await notify(removeSchool(s.id), "Escola excluída")
  }

  return (
    <>
      <PageHeader title="Escolas" description="Escola de Batismo, de Discípulos e outras: turmas, alunos e presença nas aulas.">
        {pode && (
          <>
            <Button variant="outline" onClick={() => setEscolaForm({ open: true })}><SchoolIcon /> Nova escola</Button>
            <Button disabled={schools.length === 0} onClick={() => setTurmaForm({ open: true })}><Plus /> Nova turma</Button>
          </>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Escolas" value={schools.length} icon={SchoolIcon} />
        <StatCard label="Alunos cursando" value={cursando} icon={Users} tone="success" />
        <StatCard label={`Concluíram em ${ano}`} value={concluiramAno} icon={GraduationCap} tone="highlight" />
        <StatCard label="Aulas neste mês" value={aulasMes} icon={CalendarCheck} />
      </div>

      <div className="mt-4 space-y-4">
        {schools.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {pode
                ? "Nenhuma escola cadastrada. Clique em Nova escola para começar."
                : me.memberId
                  ? "Você ainda não é professor de nenhuma turma."
                  : "Seu acesso ainda não está ligado ao seu cadastro de membro. Peça ao administrador para fazer isso em Configurações › Usuários."}
            </CardContent>
          </Card>
        )}
        {schools.map((s) => {
          const daEscola = turmas.filter((t) => t.escolaId === s.id)
          return (
            <Card key={s.id}>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2"><GraduationCap className="size-5 text-primary" /> {s.nome}</CardTitle>
                  {s.descricao && <CardDescription className="mt-1">{s.descricao}</CardDescription>}
                </div>
                {pode && (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="outline" size="sm" onClick={() => setTurmaForm({ open: true, escolaId: s.id })}><Plus /> Turma</Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Opções de ${s.nome}`}><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEscolaForm({ open: true, school: s })}><Pencil /> Editar escola</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => excluir(s)}><Trash2 /> Excluir escola</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {daEscola.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma turma ainda.</p>}
                {daEscola.map((t) => {
                  const dela = aulas.filter((a) => a.turmaId === t.id)
                  const concluiram = t.alunos.filter((a) => a.situacao === "concluido").length
                  const ativos = t.alunos.filter((a) => a.situacao === "cursando").length
                  return (
                    <Link key={t.id} href={`/app/escolas/${t.id}`} className="rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/50">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-heading text-lg font-semibold">{t.nome}</p>
                        {ativos === 0 && t.alunos.length > 0 ? <Badge variant="secondary">Encerrada</Badge> : <Badge>{ativos} cursando</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{[t.horario, t.local].filter(Boolean).join(" · ") || "Horário a definir"}</p>
                      <p className="mt-2 truncate text-sm">Professor: {t.professores.map((p) => p.nome.split(" ")[0]).join(" e ") || "—"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t.alunos.length} aluno(s) · {concluiram} concluíram · {dela.length} aula(s)
                        {dela[0] && ` · última ${formatDate(dela[0].data)}`}
                      </p>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <SchoolFormDialog key={`e${escolaForm.school?.id}${escolaForm.open}`} open={escolaForm.open && pode} onOpenChange={(open) => setEscolaForm({ open })} school={escolaForm.school} />
      <SchoolClassFormDialog
        key={`t${turmaForm.escolaId}${turmaForm.open}`}
        open={turmaForm.open && pode}
        onOpenChange={(open) => setTurmaForm({ open })}
        escolaId={turmaForm.escolaId}
        onSaved={(t) => router.push(`/app/escolas/${t.id}`)}
      />
    </>
  )
}
