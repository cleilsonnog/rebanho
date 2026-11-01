import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Building2, Copy, ShieldCheck, Users } from "lucide-react"

import { Logo } from "@/components/brand"
import { AcoesIgreja } from "@/components/admin/acoes-igreja"
import { StatCard } from "@/components/app/page-header"
import { SairButton } from "@/components/portal/portal-client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import { donoDaPlataforma, listarIgrejas, ultimasAcoes } from "@/lib/plataforma"

export const metadata: Metadata = { title: "Plataforma", robots: { index: false } }

// Painel do dono da plataforma. Quem não é dono (PLATFORM_ADMIN_EMAILS) recebe "não encontrada": nem fica
// sabendo que a página existe.
export default async function PlataformaPage() {
  const dono = await donoDaPlataforma()
  if (!dono) notFound()
  const [igrejas, acoes] = await Promise.all([listarIgrejas(), ultimasAcoes()])
  const repetidas = igrejas.filter((i) => i.nomeRepetido).length

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo href="/app" />
          <Badge variant="secondary"><ShieldCheck /> Dono da plataforma</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {dono}
          <SairButton para="/entrar" />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Igrejas" value={igrejas.length} icon={Building2} />
        <StatCard label="Membros cadastrados" value={igrejas.reduce((a, i) => a + i.membros, 0)} icon={Users} tone="success" />
        <StatCard label="Nomes repetidos (possível clone)" value={repetidas} icon={Copy} tone="highlight" />
      </div>

      <Card className="gap-0 p-0">
        <CardHeader className="border-b p-4"><CardTitle>Igrejas</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Igreja</TableHead>
              <TableHead className="hidden md:table-cell">Administrador</TableHead>
              <TableHead className="hidden sm:table-cell">Membros</TableHead>
              <TableHead className="hidden lg:table-cell">Cadastro</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {igrejas.map((i) => (
              <TableRow key={i.id} className={i.bloqueada ? "bg-destructive/5" : undefined}>
                <TableCell className="pl-4">
                  <p className="flex flex-wrap items-center gap-1.5 font-medium">
                    {i.nome}
                    {i.nomeRepetido && <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">nome repetido</Badge>}
                    {i.bloqueada && <Badge variant="destructive">bloqueada</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[i.cidade, i.cnpj && `CNPJ ${i.cnpj}`].filter(Boolean).join(" · ") || "Sem cidade nem CNPJ"}
                    {i.bloqueioMotivo && ` · ${i.bloqueioMotivo}`}
                  </p>
                </TableCell>
                <TableCell className="hidden text-sm md:table-cell">
                  {i.admins.map((a) => <p key={a.email}>{a.nome} <span className="text-muted-foreground">· {a.email}</span></p>)}
                </TableCell>
                <TableCell className="hidden text-sm sm:table-cell">{i.membros} <span className="text-muted-foreground">· equipe {i.equipe}</span></TableCell>
                <TableCell className="hidden text-sm lg:table-cell">{formatDate(i.criadaEm.slice(0, 10))}</TableCell>
                <TableCell className="pr-4"><AcoesIgreja id={i.id} nome={i.nome} bloqueada={i.bloqueada} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <CardHeader><CardTitle>O que foi feito aqui</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {acoes.length === 0 && <p className="text-muted-foreground">Nenhuma ação ainda.</p>}
          {acoes.map((a) => (
            <p key={a.id}>
              <span className="text-muted-foreground">{a.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {a.adminEmail}:</span>{" "}
              {a.acao} — <span className="font-medium">{a.churchNome}</span>
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
