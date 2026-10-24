"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Cake, Droplets, MessageCircle, Send } from "lucide-react"
import { toast } from "sonner"

import { MemberAvatar } from "@/components/app/member-avatar"
import { PageHeader, StatCard } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MONTHS_LONG, TODAY, daysUntilBirthday, parseISO, whatsappLink } from "@/lib/format"
import { useApp } from "@/lib/store"
import type { Member } from "@/lib/types"

function Row({ m, dias, data, tipo, mensagem }: { m: Member; dias: number; data: string; tipo: "nascimento" | "batismo"; mensagem: string }) {
  const d = parseISO(data)
  // Anos completados na próxima ocorrência da data.
  const anos = new Date(TODAY.getTime() + dias * 86_400_000).getFullYear() - d.getFullYear()
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
        <span className="text-lg leading-none font-semibold">{d.getDate()}</span>
        <span className="text-[10px] uppercase">{MONTHS_LONG[d.getMonth()].slice(0, 3)}</span>
      </div>
      <MemberAvatar nome={m.nome} className="hidden size-9 sm:flex" />
      <div className="min-w-0 flex-1">
        <Link href={`/app/membros/${m.id}`} className="block truncate font-medium hover:underline">{m.nome}</Link>
        <p className="text-xs text-muted-foreground">
          {tipo === "nascimento" ? `${anos} anos` : `${anos} ano(s) de batismo`} · {m.congregacao}
        </p>
      </div>
      {dias === 0 ? <Badge>Hoje</Badge> : dias <= 7 ? <Badge variant="secondary">em {dias}d</Badge> : null}
      <Button size="sm" variant="outline" asChild>
        <a href={whatsappLink(m.telefone, mensagem)} target="_blank" rel="noreferrer">
          <MessageCircle /> <span className="hidden sm:inline">Parabenizar</span>
        </a>
      </Button>
    </div>
  )
}

export default function AniversariosPage() {
  const router = useRouter()
  const members = useApp((s) => s.members)
  const church = useApp((s) => s.church)
  const whatsapp = useApp((s) => s.whatsapp)
  const [mes, setMes] = React.useState(String(TODAY.getMonth()))

  const ativos = members.filter((m) => m.status !== "transferido")
  const msg = (m: Member) =>
    whatsapp.mensagemAniversario.replace("{nome}", m.nome.split(" ")[0]).replace("{igreja}", church.nome)

  const semana = ativos
    .map((m) => ({ m, dias: daysUntilBirthday(m.nascimento) }))
    .filter((x) => x.dias <= 7)
    .sort((a, b) => a.dias - b.dias)
  const doMes = ativos
    .filter((m) => parseISO(m.nascimento).getMonth() === Number(mes))
    .sort((a, b) => parseISO(a.nascimento).getDate() - parseISO(b.nascimento).getDate())
  const batismos = ativos
    .filter((m) => m.dataBatismo && parseISO(m.dataBatismo).getMonth() === Number(mes))
    .sort((a, b) => parseISO(a.dataBatismo!).getDate() - parseISO(b.dataBatismo!).getDate())

  return (
    <>
      <PageHeader title="Aniversários" description="Ninguém passa a data sem ser lembrado.">
        <Button
          variant="outline"
          onClick={() =>
            whatsapp.conectado
              ? toast.success(`${semana.filter((s) => s.dias === 0).length} mensagem(ns) de hoje enviadas`)
              : toast.info("Conecte o WhatsApp da igreja para envio automático", { action: { label: "Conectar", onClick: () => router.push("/app/whatsapp") } })
          }
        >
          <Send /> Enviar parabéns de hoje
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Hoje" value={semana.filter((s) => s.dias === 0).length} icon={Cake} />
        <StatCard label="Próximos 7 dias" value={semana.length} icon={Cake} tone="highlight" />
        <StatCard label={`Batismos em ${MONTHS_LONG[Number(mes)].toLowerCase()}`} value={batismos.length} icon={Droplets} tone="success" />
      </div>

      <Tabs defaultValue="semana" className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="semana">Esta semana</TabsTrigger>
            <TabsTrigger value="mes">Por mês</TabsTrigger>
            <TabsTrigger value="batismo">Batismo</TabsTrigger>
          </TabsList>
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS_LONG.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <TabsContent value="semana">
          <Card>
            <CardHeader><CardTitle>Próximos 7 dias</CardTitle></CardHeader>
            <CardContent className="grid gap-2 lg:grid-cols-2">
              {semana.length === 0 && <p className="text-sm text-muted-foreground">Nenhum aniversário nesta semana.</p>}
              {semana.map(({ m, dias }) => <Row key={m.id} m={m} dias={dias} data={m.nascimento} tipo="nascimento" mensagem={msg(m)} />)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="mes">
          <Card>
            <CardHeader><CardTitle>Aniversariantes de {MONTHS_LONG[Number(mes)]} ({doMes.length})</CardTitle></CardHeader>
            <CardContent className="grid gap-2 lg:grid-cols-2">
              {doMes.map((m) => <Row key={m.id} m={m} dias={daysUntilBirthday(m.nascimento)} data={m.nascimento} tipo="nascimento" mensagem={msg(m)} />)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="batismo">
          <Card>
            <CardHeader><CardTitle>Aniversário de batismo em {MONTHS_LONG[Number(mes)]} ({batismos.length})</CardTitle></CardHeader>
            <CardContent className="grid gap-2 lg:grid-cols-2">
              {batismos.map((m) => (
                <Row
                  key={m.id}
                  m={m}
                  dias={daysUntilBirthday(m.dataBatismo!)}
                  data={m.dataBatismo!}
                  tipo="batismo"
                  mensagem={`Olá, ${m.nome.split(" ")[0]}! Hoje lembramos com alegria o aniversário do seu batismo. ${church.nome} celebra com você!`}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
