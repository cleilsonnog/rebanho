"use client"

import * as React from "react"
import { ArrowDownCircle, ArrowUpCircle, Plus, Printer, Target, Trash2, Wallet } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import { toast } from "sonner"

import { MemberPicker } from "@/components/app/member-picker"
import { PageHeader, StatCard } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { notify, useFormAction } from "@/hooks/use-form-action"
import { MONTHS, MONTHS_LONG, TODAY, formatBRL, formatAxisBRL, formatDate } from "@/lib/format"
import { canRead, canWrite } from "@/lib/permissions"
import { CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA } from "@/lib/seed"
import { useApp } from "@/lib/store"
import type { Transaction, TransactionType } from "@/lib/types"
import { transactionSchema } from "@/lib/validations"

const fluxoConfig = {
  entradas: { label: "Entradas", color: "var(--chart-1)" },
  saidas: { label: "Saídas", color: "var(--chart-2)" },
} satisfies ChartConfig

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
const FORMAS: Transaction["formaPagamento"][] = ["pix", "dinheiro", "cartao", "transferencia", "boleto"]
const FORMA_LABEL = { pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão", transferencia: "Transferência", boleto: "Boleto" }

const META_CAMPANHA = 30000

/** Aceita "1.234,56", "1234,56" e "1234.56". */
const parseValor = (v: string) => Number(v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v)

function NovoLancamento({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const add = useApp((s) => s.addTransaction)
  const [tipo, setTipo] = React.useState<TransactionType>("entrada")
  const [categoria, setCategoria] = React.useState<string>("Dízimo")
  const [forma, setForma] = React.useState<Transaction["formaPagamento"]>("pix")
  const [membroId, setMembroId] = React.useState<string>()
  const { errors, pending, submit, invalid } = useFormAction()
  const categorias = tipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const lancamento = {
      tipo,
      categoria,
      valor: parseValor(String(f.get("valor")).trim()),
      data: String(f.get("data")),
      descricao: String(f.get("descricao")).trim() || categoria,
      formaPagamento: forma,
      membroId: tipo === "entrada" && categoria === "Dízimo" ? membroId : undefined,
    }
    submit(transactionSchema, lancamento, () => add(lancamento), () => {
      toast.success("Lançamento registrado")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Tabs
              value={tipo}
              onValueChange={(v) => {
                setTipo(v as TransactionType)
                setCategoria(v === "entrada" ? "Dízimo" : "Aluguel")
              }}
            >
              <TabsList className="w-full">
                <TabsTrigger value="entrada">Entrada</TabsTrigger>
                <TabsTrigger value="saida">Saída</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Categoria</FieldLabel>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="valor">Valor (R$)</FieldLabel>
                <Input {...invalid("valor")} id="valor" name="valor" inputMode="decimal" placeholder="0,00" required />
                <FieldError>{errors.valor}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="data">Data</FieldLabel>
                <Input {...invalid("data")} id="data" name="data" type="date" defaultValue={TODAY.toISOString().slice(0, 10)} required />
                <FieldError>{errors.data}</FieldError>
              </Field>
              <Field>
                <FieldLabel>Forma</FieldLabel>
                <Select value={forma} onValueChange={(v) => setForma(v as typeof forma)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMAS.map((f) => <SelectItem key={f} value={f}>{FORMA_LABEL[f]}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            {tipo === "entrada" && categoria === "Dízimo" && (
              <Field>
                <FieldLabel>Dizimista</FieldLabel>
                <MemberPicker value={membroId} onChange={setMembroId} />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="descricao">Descrição</FieldLabel>
              <Input {...invalid("descricao")} id="descricao" name="descricao" placeholder="Ex.: Oferta do culto de domingo" />
              <FieldError>{errors.descricao}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function FinanceiroPage() {
  const transactions = useApp((s) => s.transactions)
  const members = useApp((s) => s.members)
  const remove = useApp((s) => s.removeTransaction)
  const papel = useApp((s) => s.me.papel)
  const pode = canWrite(papel, "financeiro")
  const [open, setOpen] = React.useState(false)
  const [mes, setMes] = React.useState(String(TODAY.getMonth() + 1))
  const [filtroTipo, setFiltroTipo] = React.useState<"todos" | TransactionType>("todos")
  const nomes = React.useMemo(() => new Map(members.map((m) => [m.id, m.nome])), [members])

  const ano = TODAY.getFullYear()
  const prefixo = mes === "ano" ? `${ano}` : `${ano}-${mes.padStart(2, "0")}`
  const periodo = transactions.filter((t) => t.data.startsWith(prefixo))
  const entradas = periodo.filter((t) => t.tipo === "entrada").reduce((a, t) => a + t.valor, 0)
  const saidas = periodo.filter((t) => t.tipo === "saida").reduce((a, t) => a + t.valor, 0)
  const dizimistas = new Set(periodo.filter((t) => t.categoria === "Dízimo" && t.membroId).map((t) => t.membroId)).size

  const fluxo = MONTHS.slice(0, TODAY.getMonth() + 1).map((m, i) => {
    const k = `${ano}-${String(i + 1).padStart(2, "0")}`
    const doMes = transactions.filter((t) => t.data.startsWith(k))
    return {
      mes: m,
      entradas: doMes.filter((t) => t.tipo === "entrada").reduce((a, t) => a + t.valor, 0),
      saidas: doMes.filter((t) => t.tipo === "saida").reduce((a, t) => a + t.valor, 0),
    }
  })

  const porCategoria = (tipo: TransactionType) => {
    const map = new Map<string, number>()
    for (const t of periodo.filter((t) => t.tipo === tipo)) map.set(t.categoria, (map.get(t.categoria) ?? 0) + t.valor)
    return [...map.entries()].map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor)
  }
  const catEntrada = porCategoria("entrada")
  const catSaida = porCategoria("saida")
  const campanha = transactions.filter((t) => t.categoria === "Campanha" && t.data.startsWith(`${ano}`)).reduce((a, t) => a + t.valor, 0)
  const lista = periodo.filter((t) => filtroTipo === "todos" || t.tipo === filtroTipo)

  if (!canRead(papel, "financeiro"))
    return (
      <>
        <PageHeader title="Financeiro" />
        <Card><CardContent className="py-12 text-center text-muted-foreground">Sua função não tem acesso ao financeiro.</CardContent></Card>
      </>
    )

  return (
    <>
      <PageHeader title="Financeiro" description="Dízimos, ofertas, campanhas e despesas da igreja.">
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ano">Ano de {ano}</SelectItem>
            {MONTHS_LONG.slice(0, TODAY.getMonth() + 1).map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => window.print()}><Printer /> Relatório</Button>
        <Button onClick={() => setOpen(true)}><Plus /> Lançamento</Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Entradas" value={formatBRL(entradas)} icon={ArrowUpCircle} tone="success" />
        <StatCard label="Saídas" value={formatBRL(saidas)} icon={ArrowDownCircle} tone="destructive" />
        <StatCard label="Saldo" value={formatBRL(entradas - saidas)} icon={Wallet} hint={entradas >= saidas ? "Positivo no período" : "Atenção: negativo"} />
        <StatCard label="Dizimistas" value={dizimistas} hint="Pessoas com dízimo lançado" icon={Target} tone="highlight" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fluxo mensal</CardTitle>
            <CardDescription>Entradas e saídas em {ano}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={fluxoConfig} className="h-72 w-full">
              <BarChart data={fluxo}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={formatAxisBRL} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => (
                  <div className="flex w-full justify-between gap-4"><span className="text-muted-foreground">{fluxoConfig[n as keyof typeof fluxoConfig].label}</span><span className="font-mono">{formatBRL(Number(v))}</span></div>
                )} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="entradas" fill="var(--color-entradas)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="saidas" fill="var(--color-saidas)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entradas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ valor: { label: "Valor" } }} className="mx-auto aspect-square h-44">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="categoria" hideLabel formatter={(v, n) => `${n}: ${formatBRL(Number(v))}`} />} />
                <Pie data={catEntrada} dataKey="valor" nameKey="categoria" innerRadius={45} strokeWidth={3}>
                  {catEntrada.map((c, i) => <Cell key={c.categoria} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="mt-4 space-y-2 text-sm">
              {catEntrada.map((c, i) => (
                <li key={c.categoria} className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{c.categoria}</span>
                  <span className="font-mono text-muted-foreground">{formatBRL(c.valor)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Campanha: construção do anexo</CardTitle>
            <CardDescription>Meta de {formatBRL(META_CAMPANHA)} em {ano}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold">{formatBRL(campanha)}</p>
            <Progress value={Math.min(100, (campanha / META_CAMPANHA) * 100)} className="mt-3" />
            <p className="mt-2 text-sm text-muted-foreground">{Math.round((campanha / META_CAMPANHA) * 100)}% da meta</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Para onde foi o dinheiro</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {catSaida.map((c) => (
              <div key={c.categoria}>
                <div className="flex justify-between text-sm"><span>{c.categoria}</span><span className="font-mono text-muted-foreground">{formatBRL(c.valor)}</span></div>
                <Progress value={(c.valor / Math.max(1, saidas)) * 100} className="mt-1 h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 gap-0 p-0">
        <div className="flex items-center justify-between gap-2 border-b p-4">
          <p className="font-medium">Lançamentos ({lista.length})</p>
          <Tabs value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as typeof filtroTipo)}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="entrada">Entradas</TabsTrigger>
              <TabsTrigger value="saida">Saídas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Forma</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.slice(0, 200).map((t) => (
                <TableRow key={t.id} className="group">
                  <TableCell className="pl-4">{formatDate(t.data)}</TableCell>
                  <TableCell>
                    <p className="font-medium">{t.descricao}</p>
                    {t.membroId && <p className="text-xs text-muted-foreground">{nomes.get(t.membroId)}</p>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="secondary">{t.categoria}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell">{FORMA_LABEL[t.formaPagamento]}</TableCell>
                  <TableCell className={`text-right font-mono ${t.tipo === "entrada" ? "text-success" : "text-destructive"}`}>
                    {t.tipo === "entrada" ? "+" : "−"} {formatBRL(t.valor)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100" aria-label="Excluir" hidden={!pode} onClick={() => confirm("Excluir lançamento?") && notify(remove(t.id), "Lançamento excluído")}>
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <NovoLancamento key={String(open)} open={open && pode} onOpenChange={setOpen} />
    </>
  )
}
