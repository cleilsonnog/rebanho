"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ClipboardCheck, Loader2, MapPin, MessageCircle, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { CellFormDialog } from "@/components/app/cell-form"
import { MemberAvatar } from "@/components/app/member-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { notify, useFormAction } from "@/hooks/use-form-action"
import { TODAY, cellSchedule, formatDate, whatsappLink } from "@/lib/format"
import { canWrite } from "@/lib/permissions"
import { useApp } from "@/lib/store"
import type { Cell, CellMeeting, CellVisitor, Member } from "@/lib/types"
import { cellMeetingSchema } from "@/lib/validations"

const CellsMap = dynamic(() => import("@/components/app/cells-map"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>,
})

const hoje = TODAY.toISOString().slice(0, 10)
const dia = 86_400_000

/** Data da reunião desta semana (o último dia da célula até hoje), para já abrir na reunião certa. */
function ultimaReuniao(c: Cell) {
  if (c.diaSemana === undefined) return hoje
  const ref = new Date(`${hoje}T00:00:00Z`)
  return new Date(ref.getTime() - ((ref.getUTCDay() - c.diaSemana + 7) % 7) * dia).toISOString().slice(0, 10)
}

type Pessoa = { member: Member; funcao?: string }

function Lideranca({ titulo, ids, byId }: { titulo: string; ids: string[]; byId: Map<string, Member> }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{titulo}</p>
      {ids.length === 0 && <p className="text-sm">—</p>}
      {ids.map((id) => {
        const m = byId.get(id)
        if (!m) return null
        return (
          <div key={id} className="mt-1.5 flex items-center gap-2">
            <MemberAvatar nome={m.nome} className="size-7 text-[10px]" />
            <Link href={`/app/membros/${m.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">{m.nome}</Link>
            {m.telefone && (
              <Button variant="ghost" size="icon-sm" asChild aria-label={`WhatsApp de ${m.nome}`}>
                <a href={whatsappLink(m.telefone)} target="_blank" rel="noreferrer"><MessageCircle /></a>
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ReuniaoForm({
  cell,
  pessoas,
  data,
  setData,
  meeting,
  pode,
}: {
  cell: Cell
  pessoas: Pessoa[]
  data: string
  setData: (d: string) => void
  meeting?: CellMeeting
  pode: boolean
}) {
  const saveCellMeeting = useApp((s) => s.saveCellMeeting)
  const { errors, pending, submit, invalid } = useFormAction()
  const [presentes, setPresentes] = React.useState<string[]>(meeting?.presentes ?? [])
  const [visitantes, setVisitantes] = React.useState<CellVisitor[]>(meeting?.visitantes ?? [])
  const [observacoes, setObservacoes] = React.useState(meeting?.observacoes ?? "")

  const marcar = (id: string, sim: boolean) => setPresentes((p) => (sim ? [...p, id] : p.filter((x) => x !== id)))
  const setVisitante = (i: number, v: Partial<CellVisitor>) => setVisitantes((vs) => vs.map((x, j) => (j === i ? { ...x, ...v } : x)))

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const r = { celulaId: cell.id, data, presentes, visitantes, observacoes }
    submit(cellMeetingSchema, r, () => saveCellMeeting(r), () => toast.success(`Reunião de ${formatDate(data)} salva`))
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader className="flex-row flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><ClipboardCheck className="size-4 text-primary" /> Reunião</CardTitle>
            <CardDescription>{meeting ? "Reunião já lançada. Você pode corrigir e salvar de novo." : "Marque quem veio e anote os visitantes."}</CardDescription>
          </div>
          <Field className="w-44">
            <FieldLabel htmlFor="r-data">Data</FieldLabel>
            <Input {...invalid("data")} id="r-data" type="date" max={hoje} value={data} onChange={(e) => e.target.value && setData(e.target.value)} />
            <FieldError>{errors.data}</FieldError>
          </Field>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Presença · {presentes.length} de {pessoas.length}</p>
              {pode && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPresentes(presentes.length === pessoas.length ? [] : pessoas.map((p) => p.member.id))}
                >
                  {presentes.length === pessoas.length ? "Desmarcar todos" : "Marcar todos"}
                </Button>
              )}
            </div>
            <div className="divide-y rounded-lg border">
              {pessoas.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nenhum membro na célula ainda.</p>}
              {pessoas.map(({ member: m, funcao }) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                  <Checkbox checked={presentes.includes(m.id)} disabled={!pode} onCheckedChange={(c) => marcar(m.id, c === true)} />
                  <MemberAvatar nome={m.nome} className="size-7 text-[10px]" />
                  <span className="min-w-0 flex-1 truncate text-sm">{m.nome}</span>
                  {funcao && <Badge variant="outline">{funcao}</Badge>}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Visitantes · {visitantes.length}</p>
              {pode && (
                <Button type="button" variant="outline" size="sm" onClick={() => setVisitantes((v) => [...v, { nome: "", telefone: "" }])}>
                  <Plus /> Visitante
                </Button>
              )}
            </div>
            {visitantes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum visitante nesta reunião.</p>}
            <div className="space-y-2">
              {visitantes.map((v, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Input
                    {...invalid(`visitantes.${i}.nome`)}
                    aria-label="Nome do visitante"
                    placeholder="Nome"
                    value={v.nome}
                    disabled={!pode}
                    onChange={(e) => setVisitante(i, { nome: e.target.value })}
                  />
                  <Input
                    {...invalid(`visitantes.${i}.telefone`)}
                    aria-label="Telefone do visitante"
                    className="w-44 shrink-0"
                    inputMode="tel"
                    placeholder="(62) 99999-9999"
                    value={v.telefone}
                    disabled={!pode}
                    onChange={(e) => setVisitante(i, { telefone: e.target.value })}
                  />
                  {pode && (
                    <Button type="button" variant="ghost" size="icon" aria-label="Tirar visitante" onClick={() => setVisitantes((vs) => vs.filter((_, j) => j !== i))}>
                      <X />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="r-obs">Observações da reunião</FieldLabel>
            <Textarea
              {...invalid("observacoes")}
              id="r-obs"
              rows={4}
              disabled={!pode}
              placeholder="Tema do estudo, pedidos de oração, quem precisa de visita…"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
            <FieldError>{errors.observacoes}</FieldError>
          </Field>

          {pode && (
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar reunião"}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  )
}

export default function CelulaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const cell = useApp((s) => s.cells.find((c) => c.id === id))
  const allMeetings = useApp((s) => s.cellMeetings)
  const members = useApp((s) => s.members)
  const removeCell = useApp((s) => s.removeCell)
  const removeCellMeeting = useApp((s) => s.removeCellMeeting)
  const podeCelula = useApp((s) => canWrite(s.me.papel, "celulas"))
  const podeReuniao = useApp((s) => canWrite(s.me.papel, "reunioes"))
  const [editando, setEditando] = React.useState(false)
  const [data, setData] = React.useState(() => (cell ? ultimaReuniao(cell) : hoje))
  const byId = React.useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const meetings = React.useMemo(() => allMeetings.filter((r) => r.celulaId === id), [allMeetings, id])

  if (!cell)
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Célula não encontrada.</p>
        <Button variant="outline" className="mt-4" asChild><Link href="/app/celulas">Voltar</Link></Button>
      </div>
    )

  const funcao = (mid: string) =>
    cell.lideres.includes(mid) ? "Líder" : cell.colideres.includes(mid) ? "Colíder" : cell.anfitrioes.includes(mid) ? "Anfitrião" : undefined
  const ordem = [...new Set([...cell.lideres, ...cell.colideres, ...cell.anfitrioes, ...cell.membroIds])]
  const pessoas: Pessoa[] = ordem.flatMap((mid) => {
    const m = byId.get(mid)
    return m ? [{ member: m, funcao: funcao(mid) }] : []
  })
  const meeting = meetings.find((r) => r.data === data)
  const media = meetings.length ? Math.round(meetings.reduce((a, r) => a + r.presentes.length, 0) / meetings.length) : 0
  const temMapa = cell.lat !== 0 || cell.lng !== 0

  async function excluir() {
    if (!confirm(`Excluir a célula ${cell!.nome} e todas as reuniões lançadas? Os membros continuam cadastrados.`)) return
    if (await notify(removeCell(cell!.id), "Célula excluída")) router.push("/app/celulas")
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link href="/app/celulas"><ArrowLeft /> Células</Link>
      </Button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">Célula {cell.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cellSchedule(cell)} · {pessoas.length} pessoas · média de {media} presentes por reunião
          </p>
        </div>
        {podeCelula && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={excluir}><Trash2 /> Excluir</Button>
            <Button onClick={() => setEditando(true)}><Pencil /> Editar célula</Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <ReuniaoForm key={`${data}:${meeting?.id ?? ""}`} cell={cell} pessoas={pessoas} data={data} setData={setData} meeting={meeting} pode={podeReuniao} />

          <Card>
            <CardHeader><CardTitle>Reuniões lançadas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {meetings.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma reunião lançada nos últimos 12 meses.</p>}
              {meetings.map((r) => (
                <div key={r.id} className="group rounded-xl border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="font-medium hover:underline" onClick={() => setData(r.data)}>{formatDate(r.data)}</button>
                    <Badge variant="secondary">{r.presentes.length} presentes</Badge>
                    {r.visitantes.length > 0 && <Badge variant="outline">{r.visitantes.length} visitante(s)</Badge>}
                    {r.data === data && <Badge>aberta acima</Badge>}
                    {podeReuniao && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="ml-auto opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label="Excluir reunião"
                        onClick={() => confirm("Excluir esta reunião?") && notify(removeCellMeeting(r.id), "Reunião excluída")}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                  {r.visitantes.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">Visitantes: {r.visitantes.map((v) => v.nome).join(", ")}</p>
                  )}
                  {r.observacoes && <p className="mt-1 text-sm whitespace-pre-wrap">{r.observacoes}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Liderança</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Lideranca titulo="Líderes" ids={cell.lideres} byId={byId} />
              <Lideranca titulo="Colíderes" ids={cell.colideres} byId={byId} />
              <Lideranca titulo="Anfitrião" ids={cell.anfitrioes} byId={byId} />
            </CardContent>
          </Card>
          <Card className="overflow-hidden pb-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> Onde se reúne</CardTitle>
              <CardDescription>
                {cell.endereco.rua ? `${cell.endereco.rua}, ${cell.endereco.numero} · ${cell.endereco.bairro} · ${cell.endereco.cidade}/${cell.endereco.uf}` : "Endereço a definir"}
              </CardDescription>
            </CardHeader>
            <div className="h-64 border-t">
              {temMapa ? (
                <CellsMap cells={[cell]} members={members} focus={cell} />
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">Sem local no mapa. Edite a célula e marque a casa do anfitrião.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <CellFormDialog key={String(editando)} open={editando && podeCelula} onOpenChange={setEditando} cell={cell} />
    </>
  )
}
