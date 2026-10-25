"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, MoreHorizontal, Search, Upload, UserPlus } from "lucide-react"

import { MemberAvatar, StatusBadge } from "@/components/app/member-avatar"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CARGOS } from "@/lib/seed"
import { STATUS_LABEL, age, whatsappLink } from "@/lib/format"
import { notify } from "@/hooks/use-form-action"
import { canWrite } from "@/lib/permissions"
import { useApp } from "@/lib/store"
import type { Member, MemberStatus } from "@/lib/types"

const PAGE_SIZE = 15

function toCSV(members: Member[]) {
  const header = ["Nome", "Sexo", "Nascimento", "Telefone", "E-mail", "Bairro", "Cidade", "Congregação", "Cargo", "Situação", "Batizado"]
  const rows = members.map((m) => [
    m.nome, m.sexo, m.nascimento, m.telefone, m.email, m.endereco.bairro, m.endereco.cidade,
    m.congregacao, m.cargo, STATUS_LABEL[m.status], m.batizado ? "Sim" : "Não",
  ])
  return [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n")
}

export default function MembrosPage() {
  const router = useRouter()
  const members = useApp((s) => s.members)
  const congregacoes = useApp((s) => s.church.congregacoes)
  const removeMember = useApp((s) => s.removeMember)
  const pode = useApp((s) => canWrite(s.me.papel, "membros"))

  const [q, setQ] = React.useState("")
  const [status, setStatus] = React.useState<"todos" | MemberStatus>("todos")
  const [cong, setCong] = React.useState("todas")
  const [cargo, setCargo] = React.useState("todos")
  const [page, setPage] = React.useState(0)
  const resetting = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(0)
  }

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase()
    return members
      .filter((m) => status === "todos" || m.status === status)
      .filter((m) => cong === "todas" || m.congregacao === cong)
      .filter((m) => cargo === "todos" || m.cargo === cargo)
      .filter(
        (m) =>
          !term ||
          m.nome.toLowerCase().includes(term) ||
          m.telefone.replace(/\D/g, "").includes(term.replace(/\D/g, "") || "§") ||
          m.endereco.bairro.toLowerCase().includes(term)
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  }, [members, q, status, cong, cargo])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function exportCSV() {
    const blob = new Blob(["﻿" + toCSV(filtered)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "membros.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader title="Membros" description={`${members.length} pessoas cadastradas`}>
        <Button variant="outline" onClick={exportCSV}><Download /> Exportar</Button>
        <Button variant="outline" asChild><Link href="/app/importar"><Upload /> Importar</Link></Button>
        <Button asChild><Link href="/app/membros/novo"><UserPlus /> Novo membro</Link></Button>
      </PageHeader>

      <Card className="gap-0 p-0">
        <div className="flex flex-col gap-2 border-b p-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => resetting(setQ)(e.target.value)} placeholder="Buscar por nome, telefone ou bairro" className="pl-8" />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:flex">
            <Select value={status} onValueChange={resetting((v: string) => setStatus(v as typeof status))}>
              <SelectTrigger className="w-full lg:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas situações</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={cong} onValueChange={resetting(setCong)}>
              <SelectTrigger className="w-full lg:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas congregações</SelectItem>
                {congregacoes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={cargo} onValueChange={resetting(setCargo)}>
              <SelectTrigger className="w-full lg:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos cargos</SelectItem>
                {CARGOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Nome</TableHead>
              <TableHead className="hidden md:table-cell">Congregação</TableHead>
              <TableHead className="hidden lg:table-cell">Cargo</TableHead>
              <TableHead className="hidden sm:table-cell">Idade</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((m) => (
              <TableRow key={m.id} className="cursor-pointer" onClick={() => router.push(`/app/membros/${m.id}`)}>
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <MemberAvatar nome={m.nome} className="size-8" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.telefone}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{m.congregacao}</TableCell>
                <TableCell className="hidden lg:table-cell">{m.cargo}</TableCell>
                <TableCell className="hidden sm:table-cell">{age(m.nascimento)}</TableCell>
                <TableCell><StatusBadge status={m.status} /></TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Ações"><MoreHorizontal /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild><Link href={`/app/membros/${m.id}`}>Abrir ficha</Link></DropdownMenuItem>
                      {pode && <DropdownMenuItem asChild><Link href={`/app/membros/${m.id}/editar`}>Editar</Link></DropdownMenuItem>}
                      <DropdownMenuItem asChild>
                        <a href={whatsappLink(m.telefone)} target="_blank" rel="noreferrer">WhatsApp</a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href={`/app/carteirinhas?membro=${m.id}`}>Carteirinha</Link></DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        hidden={!pode}
                        variant="destructive"
                        onSelect={() => {
                          if (confirm(`Excluir ${m.nome}? Esta ação não pode ser desfeita.`)) notify(removeMember(m.id), `${m.nome} excluído(a)`)
                        }}
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Nenhuma pessoa encontrada com esses filtros.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
          <span>{filtered.length} resultado(s)</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <span>{page + 1} / {pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      </Card>
    </>
  )
}
