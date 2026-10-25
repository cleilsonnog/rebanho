"use client"

import * as React from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { ArrowRight, Cake, CalendarDays, Droplets, HeartHandshake, Church, UserPlus, Users } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts"

import { CellStudyCard } from "@/components/app/cell-study"
import { MemberAvatar } from "@/components/app/member-avatar"
import { PageHeader, StatCard } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { MONTHS, TODAY, age, ageBands, daysUntilBirthday, formatBRL, formatAxisBRL, formatDate, inicioDaSemana, parseISO } from "@/lib/format"
import { canRead, canWrite } from "@/lib/permissions"
import { useApp } from "@/lib/store"

const financeConfig = {
  entradas: { label: "Entradas", color: "var(--chart-1)" },
  saidas: { label: "Saídas", color: "var(--chart-2)" },
} satisfies ChartConfig

const ageConfig = { total: { label: "Pessoas", color: "var(--chart-1)" } } satisfies ChartConfig

const genderConfig = {
  F: { label: "Mulheres", color: "var(--chart-1)" },
  M: { label: "Homens", color: "var(--chart-2)" },
} satisfies ChartConfig

export default function DashboardPage() {
  const { members, transactions, visits, events, church } = useApp()
  const papel = useApp((s) => s.me.papel)
  const estudo = useApp((s) => s.cellStudies.find((e) => e.semana === inicioDaSemana(TODAY.toISOString().slice(0, 10))))
  const { user } = useUser()

  const data = React.useMemo(() => {
    const ativos = members.filter((m) => m.status === "ativo")
    const membrosIgreja = members.filter((m) => m.status === "ativo" || m.status === "afastado")
    const mesAtual = TODAY.toISOString().slice(0, 7)
    const visitantesMes = members.filter((m) => m.status === "visitante" && m.membroDesde.startsWith(mesAtual)).length
    const novosMes = members.filter((m) => m.status !== "visitante" && m.membroDesde.startsWith(mesAtual)).length

    const fluxo = MONTHS.slice(0, TODAY.getMonth() + 1).map((mes, i) => {
      const key = `${TODAY.getFullYear()}-${String(i + 1).padStart(2, "0")}`
      const doMes = transactions.filter((t) => t.data.startsWith(key))
      return {
        mes,
        entradas: doMes.filter((t) => t.tipo === "entrada").reduce((a, t) => a + t.valor, 0),
        saidas: doMes.filter((t) => t.tipo === "saida").reduce((a, t) => a + t.valor, 0),
      }
    })
    const doMesAtual = fluxo[fluxo.length - 1]

    const genero = (["F", "M"] as const).map((s) => ({
      sexo: s,
      total: membrosIgreja.filter((m) => m.sexo === s).length,
      fill: `var(--color-${s})`,
    }))

    const aniversariantes = members
      .filter((m) => m.status !== "transferido")
      .map((m) => ({ m, dias: daysUntilBirthday(m.nascimento) }))
      .filter((x) => x.dias <= 7)
      .sort((a, b) => a.dias - b.dias)

    const ultimaVisita = new Map<string, string>()
    for (const v of visits) if (!ultimaVisita.has(v.membroId)) ultimaVisita.set(v.membroId, v.data)
    const semVisita = members
      .filter((m) => m.status === "afastado")
      .filter((m) => {
        const u = ultimaVisita.get(m.id)
        return !u || (TODAY.getTime() - parseISO(u).getTime()) / 86_400_000 > 60
      })

    return {
      ativos,
      membrosIgreja,
      batizados: membrosIgreja.filter((m) => m.batizado).length,
      visitantesMes,
      novosMes,
      fluxo,
      doMesAtual,
      faixas: ageBands(membrosIgreja),
      genero,
      aniversariantes,
      semVisita,
      proximos: events.filter((e) => e.data >= TODAY.toISOString().slice(0, 10)).slice(0, 5),
    }
  }, [members, transactions, visits, events])

  const totalGenero = data.genero.reduce((a, g) => a + g.total, 0) || 1

  return (
    <>
      <PageHeader
        title={user?.firstName ? `Olá, ${user.firstName}!` : "Olá!"}
        description={`${church.nome} · ${TODAY.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}`}
      >
        {canWrite(papel, "visitas") && <Button variant="outline" asChild><Link href="/app/visitas?nova=1"><HeartHandshake /> Registrar visita</Link></Button>}
        {canWrite(papel, "membros") && <Button asChild><Link href="/app/membros/novo"><UserPlus /> Novo membro</Link></Button>}
      </PageHeader>

      {papel === "admin" && (church.lat === 0 || !church.logoUrl) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-highlight/40 bg-highlight/10 p-4 text-sm">
          <p>
            <span className="font-medium">Complete o cadastro da igreja:</span>{" "}
            {[church.lat === 0 && "o endereço (para os mapas abrirem na igreja)", !church.logoUrl && "a logo (carteirinhas e certificados)"]
              .filter(Boolean)
              .join(" e ")}
            .
          </p>
          <Button size="sm" variant="outline" asChild><Link href="/app/configuracoes">Ir para Configurações</Link></Button>
        </div>
      )}

      {estudo && <CellStudyCard key={estudo.id} study={estudo} className="mb-4" />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Membros" value={data.membrosIgreja.length} hint={`${data.ativos.length} ativos · +${data.novosMes} este mês`} icon={Users} />
        <StatCard label="Congregações" value={church.congregacoes.length} hint="Sede e congregações" icon={Church} tone="highlight" />
        <StatCard label="Batizados" value={data.batizados} hint={`${Math.round((data.batizados / Math.max(1, data.membrosIgreja.length)) * 100)}% dos membros`} icon={Droplets} tone="success" />
        <StatCard label="Visitantes no mês" value={data.visitantesMes} hint="Acompanhe em Visitas" icon={UserPlus} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fluxo financeiro {TODAY.getFullYear()}</CardTitle>
            <CardDescription>
              Outubro: {formatBRL(data.doMesAtual.entradas)} de entradas e {formatBRL(data.doMesAtual.saidas)} de saídas
            </CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild><Link href="/app/financeiro">Ver financeiro <ArrowRight /></Link></Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ChartContainer config={financeConfig} className="h-64 w-full">
              <LineChart data={data.fluxo} margin={{ left: 4, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={formatAxisBRL} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => (
                  <div className="flex w-full justify-between gap-4"><span className="text-muted-foreground">{financeConfig[n as keyof typeof financeConfig].label}</span><span className="font-mono">{formatBRL(Number(v))}</span></div>
                )} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line dataKey="entradas" type="monotone" stroke="var(--color-entradas)" strokeWidth={2.5} dot={false} />
                <Line dataKey="saidas" type="monotone" stroke="var(--color-saidas)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Cake className="size-4 text-primary" /> Aniversariantes</CardTitle>
            <CardDescription>Próximos 7 dias</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild><Link href="/app/aniversarios">Todos</Link></Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.aniversariantes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum aniversário nesta semana.</p>}
            {data.aniversariantes.slice(0, 6).map(({ m, dias }) => (
              <Link key={m.id} href={`/app/membros/${m.id}`} className="flex items-center gap-3 rounded-lg p-1 hover:bg-muted">
                <MemberAvatar nome={m.nome} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.nome}</p>
                  <p className="text-xs text-muted-foreground">Faz {age(m.nascimento) + (dias === 0 ? 0 : 1)} anos</p>
                </div>
                <Badge variant={dias === 0 ? "default" : "secondary"}>{dias === 0 ? "Hoje" : dias === 1 ? "Amanhã" : `em ${dias} dias`}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Faixa etária</CardTitle>
            <CardDescription>Membros ativos e afastados</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ageConfig} className="h-56 w-full">
              <BarChart data={data.faixas}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="faixa" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={6} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gênero</CardTitle>
            <CardDescription>Distribuição dos membros</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <ChartContainer config={genderConfig} className="aspect-square h-44">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="sexo" hideLabel />} />
                <Pie data={data.genero} dataKey="total" nameKey="sexo" innerRadius={48} strokeWidth={4}>
                  {data.genero.map((g) => <Cell key={g.sexo} fill={g.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="space-y-3">
              {data.genero.map((g) => (
                <div key={g.sexo}>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="size-2.5 rounded-full" style={{ background: genderConfig[g.sexo].color }} />
                    {genderConfig[g.sexo].label}
                  </p>
                  <p className="font-heading text-2xl font-semibold">{Math.round((g.total / totalGenero) * 100)}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" /> Próximos eventos</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild><Link href="/app/agenda">Agenda</Link></Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.proximos.map((e) => {
              const d = parseISO(e.data)
              return (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-[10px] font-medium uppercase">{MONTHS[d.getMonth()]}</span>
                    <span className="text-base leading-none font-semibold">{d.getDate()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.titulo}</p>
                    <p className="text-xs text-muted-foreground">{e.hora} · {e.local}</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {canRead(papel, "visitas") && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Precisam de atenção</CardTitle>
            <CardDescription>Membros afastados sem visita nos últimos 60 dias ({data.semVisita.length})</CardDescription>
            <CardAction>
              <Button variant="outline" size="sm" asChild><Link href="/app/visitas?nova=1">Agendar visita</Link></Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.semVisita.slice(0, 9).map((m) => (
                <Link key={m.id} href={`/app/membros/${m.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted">
                  <MemberAvatar nome={m.nome} className="size-9" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.endereco.bairro} · membro desde {formatDate(m.membroDesde).slice(-4)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
