"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookOpen, CalendarCheck, House, Loader2, MapPin, Plus, UserPlus, Users } from "lucide-react"

import { CellFormDialog } from "@/components/app/cell-form"
import { CellStudyCard } from "@/components/app/cell-study"
import { MemberAvatar } from "@/components/app/member-avatar"
import { PageHeader, StatCard } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TODAY, cellSchedule, formatDate, inicioDaSemana } from "@/lib/format"
import { canWrite } from "@/lib/permissions"
import { useApp } from "@/lib/store"

const CellsMap = dynamic(() => import("@/components/app/cells-map"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>,
})

const nomes = (ids: string[], byId: Map<string, { nome: string }>) =>
  ids.map((id) => byId.get(id)?.nome.split(" ")[0]).filter(Boolean).join(" e ") || "—"

export default function CelulasPage() {
  const router = useRouter()
  const cells = useApp((s) => s.cells)
  const meetings = useApp((s) => s.cellMeetings)
  const members = useApp((s) => s.members)
  const pode = useApp((s) => canWrite(s.me.papel, "celulas"))
  const me = useApp((s) => s.me)
  const podeEstudo = useApp((s) => canWrite(s.me.papel, "estudos"))
  const estudo = useApp((s) => s.cellStudies.find((e) => e.semana === inicioDaSemana(TODAY.toISOString().slice(0, 10))))
  const [open, setOpen] = React.useState(false)
  const byId = React.useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  const ultima = (id: string) => meetings.find((r) => r.celulaId === id)
  const naCelula = cells.reduce((a, c) => a + c.membroIds.length, 0)
  const mes = new Date().toISOString().slice(0, 7)
  const doMes = meetings.filter((r) => r.data.startsWith(mes))
  const visitantesMes = doMes.reduce((a, r) => a + r.visitantes.length, 0)
  const semMapa = cells.filter((c) => c.lat === 0 && c.lng === 0).length

  return (
    <>
      <PageHeader title="Células" description="Liderança, presença, visitantes e a casa de cada célula no mapa.">
        <Button variant="outline" asChild><Link href="/app/celulas/estudos"><BookOpen /> Estudo da semana</Link></Button>
        {pode && <Button onClick={() => setOpen(true)}><Plus /> Nova célula</Button>}
      </PageHeader>

      {estudo ? (
        <CellStudyCard key={estudo.id} study={estudo} className="mb-4" />
      ) : (
        <p className="mb-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Nenhum estudo publicado para esta semana.
          {podeEstudo && <> <Link href="/app/celulas/estudos" className="font-medium text-primary hover:underline">Publicar estudo</Link></>}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Células" value={cells.length} icon={House} />
        <StatCard label="Pessoas em células" value={naCelula} icon={Users} tone="success" />
        <StatCard label="Reuniões neste mês" value={doMes.length} icon={CalendarCheck} tone="highlight" />
        <StatCard label="Visitantes neste mês" value={visitantesMes} icon={UserPlus} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {cells.length === 0 && (
            <Card className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <CardContent className="py-12 text-center text-muted-foreground">
                {pode
                  ? "Nenhuma célula cadastrada. Clique em Nova célula para começar."
                  : me.memberId
                    ? "Você ainda não aparece como líder ou colíder de nenhuma célula. Fale com a secretaria."
                    : "Seu acesso ainda não está ligado ao seu cadastro de membro. Peça ao administrador para fazer isso em Configurações › Usuários."}
              </CardContent>
            </Card>
          )}
          {cells.map((c) => {
            const r = ultima(c.id)
            return (
              <Link key={c.id} href={`/app/celulas/${c.id}`} className="rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-heading text-lg font-semibold">{c.nome}</p>
                    <p className="text-sm text-muted-foreground">{cellSchedule(c)}</p>
                  </div>
                  <Badge variant="secondary">{c.membroIds.length} pessoas</Badge>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {c.lideres.map((id) => byId.get(id) && <MemberAvatar key={id} nome={byId.get(id)!.nome} className="size-7 border-2 border-card text-[10px]" />)}
                  </div>
                  <p className="truncate text-sm">Líderes: {nomes(c.lideres, byId)}</p>
                </div>
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" /> Casa de {nomes(c.anfitrioes, byId)} · {c.endereco.bairro || "endereço a definir"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {r ? `Última reunião ${formatDate(r.data)}: ${r.presentes.length} presentes, ${r.visitantes.length} visitante(s)` : "Nenhuma reunião lançada"}
                </p>
              </Link>
            )
          })}
        </div>

        <Card className="h-[480px] self-start overflow-hidden p-0 lg:sticky lg:top-4 lg:h-[620px]">
          <CardHeader className="sr-only"><CardTitle>Mapa das células</CardTitle></CardHeader>
          <CellsMap cells={cells} members={members} />
        </Card>
      </div>
      {semMapa > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">{semMapa} célula(s) sem local no mapa. Edite a célula e marque a casa do anfitrião.</p>
      )}

      <CellFormDialog key={String(open)} open={open && pode} onOpenChange={setOpen} onSaved={(c) => router.push(`/app/celulas/${c.id}`)} />
    </>
  )
}
