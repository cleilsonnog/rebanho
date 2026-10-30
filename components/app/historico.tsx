"use client"

import * as React from "react"
import { History, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { listarHistorico } from "@/lib/actions/audit"
import { ROLE_LABEL } from "@/lib/format"
import type { UserRole } from "@/lib/types"

type Item = { id: string; quando: string; quem: string; papel: UserRole; area: string | null; descricao: string }

const AREAS: Record<string, string> = {
  membros: "Membros",
  visitas: "Visitas",
  celulas: "Células",
  reunioes: "Reuniões",
  estudos: "Estudos",
  agenda: "Agenda",
  certificados: "Certificados",
  financeiro: "Financeiro",
  whatsapp: "WhatsApp",
  configuracoes: "Configurações",
  admin: "Usuários e dados",
}

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })

/** Quem mudou o quê e quando (lib/audit.ts). Carrega 50 por vez, direto do servidor. */
export function HistoricoSettings() {
  const [area, setArea] = React.useState("todas")
  const [itens, setItens] = React.useState<Item[]>([])
  const [temMais, setTemMais] = React.useState(false)
  const [carregando, setCarregando] = React.useState(true)

  const buscar = (depoisDe?: string) => listarHistorico({ depoisDe, area: area === "todas" ? undefined : area })

  function mostrar(r: Awaited<ReturnType<typeof listarHistorico>>, juntar: boolean) {
    setCarregando(false)
    if (!r.ok) return void toast.error(r.error)
    setItens((atual) => (juntar ? [...atual, ...r.data.itens] : r.data.itens))
    setTemMais(r.data.temMais)
  }

  // Primeira página: ao abrir a aba e a cada troca de área (resposta de um filtro antigo é ignorada).
  React.useEffect(() => {
    let atual = true
    listarHistorico({ area: area === "todas" ? undefined : area }).then((r) => atual && mostrar(r, false))
    return () => {
      atual = false
    }
  }, [area])

  function trocarArea(valor: string) {
    setCarregando(true)
    setArea(valor)
  }

  async function carregarMais() {
    setCarregando(true)
    mostrar(await buscar(itens.at(-1)?.id), true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle>Histórico de alterações</CardTitle>
          <CardDescription>
            Quem cadastrou, editou ou excluiu algo, e quando. Fica guardado por 12 meses e ninguém consegue apagar,
            nem mesmo ao apagar os dados da igreja.
          </CardDescription>
        </div>
        <Select value={area} onValueChange={trocarArea}>
          <SelectTrigger className="w-48" aria-label="Filtrar por área"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as áreas</SelectItem>
            {Object.entries(AREAS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Quando</TableHead>
            <TableHead className="w-48">Quem</TableHead>
            <TableHead>O que fez</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itens.map((i) => (
            <TableRow key={i.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">{quando(i.quando)}</TableCell>
              <TableCell>
                <p className="font-medium">{i.quem}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABEL[i.papel]}</p>
              </TableCell>
              <TableCell className="whitespace-normal">
                {i.descricao}
                <Badge variant="outline" className="ml-2 align-middle">{AREAS[i.area ?? "admin"] ?? i.area}</Badge>
              </TableCell>
            </TableRow>
          ))}
          {!carregando && itens.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="py-12 text-center text-muted-foreground">
                <History className="mx-auto mb-2 size-6" />
                Nenhuma alteração registrada ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {(carregando || temMais) && (
        <div className="flex justify-center p-4">
          <Button variant="outline" size="sm" disabled={carregando} onClick={carregarMais}>
            {carregando ? <><Loader2 className="animate-spin" /> Carregando…</> : "Carregar mais"}
          </Button>
        </div>
      )}
    </Card>
  )
}
