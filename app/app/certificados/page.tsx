"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Printer, Search } from "lucide-react"
import { toast } from "sonner"

import { AccessGuard } from "@/components/app/access-guard"
import { Certificate } from "@/components/app/certificate"
import { MemberAvatar } from "@/components/app/member-avatar"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TODAY, formatDate } from "@/lib/format"
import { TIPOS_CERTIFICADO } from "@/lib/seed"
import { canWrite } from "@/lib/permissions"
import { useApp } from "@/lib/store"
import { certificatesSchema } from "@/lib/validations"
import type { CertificateStyle } from "@/lib/types"

const ESTILOS: { value: CertificateStyle; label: string }[] = [
  { value: "classico", label: "Clássico" },
  { value: "moderno", label: "Moderno" },
  { value: "minimalista", label: "Minimalista" },
]

function CertificadosContent() {
  const params = useSearchParams()
  const members = useApp((s) => s.members)
  const church = useApp((s) => s.church)
  const certificates = useApp((s) => s.certificates)
  const addCertificates = useApp((s) => s.addCertificates)
  const pode = useApp((s) => canWrite(s.me.papel, "certificados"))
  const [pending, setPending] = React.useState(false)
  const nomes = React.useMemo(() => new Map(members.map((m) => [m.id, m.nome])), [members])

  // Vindo de outra tela (ficha do membro, turma de uma escola), já abre com as pessoas e o modelo escolhidos.
  const [tipo, setTipo] = React.useState<string>(() => TIPOS_CERTIFICADO.find((t) => t === params.get("tipo")) ?? TIPOS_CERTIFICADO[0])
  const [estilo, setEstilo] = React.useState<CertificateStyle>("classico")
  const [detalhe, setDetalhe] = React.useState(params.get("detalhe") ?? "")
  const [data, setData] = React.useState(TODAY.toISOString().slice(0, 10))
  const [q, setQ] = React.useState("")
  const [selected, setSelected] = React.useState<string[]>(() =>
    (params.get("membros") ?? params.get("membro") ?? "").split(",").filter(Boolean)
  )

  const lista = members
    .filter((m) => m.status !== "transferido" && m.nome.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  const escolhidos = members.filter((m) => selected.includes(m.id))
  const preview = escolhidos[0] ?? lista[0]

  async function emitir() {
    const lote = { membroIds: escolhidos.map((m) => m.id), tipo, estilo, emitidoEm: data, detalhe }
    const erro = certificatesSchema.safeParse(lote).error?.issues[0]
    if (erro) return toast.error(erro.message)
    setPending(true)
    const r = await addCertificates(lote).finally(() => setPending(false))
    if (!r.ok) return toast.error(r.error)
    toast.success(`${r.data.length} certificado(s) registrados`)
    setTimeout(() => window.print(), 100)
  }

  return (
    <>
      <PageHeader title="Certificados" description="Batismo, cursos, congressos e mais, em três estilos, um a um ou em lote.">
        <Button disabled={escolhidos.length === 0 || pending || !pode} onClick={emitir}>
          <Printer /> Emitir {escolhidos.length || ""} e imprimir / PDF
        </Button>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Modelo</CardTitle></CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel>Tipo</FieldLabel>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS_CERTIFICADO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Estilo</FieldLabel>
                  <RadioGroup value={estilo} onValueChange={(v) => setEstilo(v as CertificateStyle)} className="grid grid-cols-3">
                    {ESTILOS.map((e) => (
                      <label key={e.value} className="flex items-center gap-1.5 text-sm"><RadioGroupItem value={e.value} /> {e.label}</label>
                    ))}
                  </RadioGroup>
                </Field>
                <Field>
                  <FieldLabel htmlFor="det">Complemento</FieldLabel>
                  <Input id="det" value={detalhe} onChange={(e) => setDetalhe(e.target.value)} placeholder="Ex.: Curso de Discipulado (40h)" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="dt">Data</FieldLabel>
                  <Input id="dt" type="date" value={data} onChange={(e) => setData(e.target.value)} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Pessoas ({selected.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="pl-8" />
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {lista.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 rounded-md p-1.5 text-sm hover:bg-muted">
                    <Checkbox checked={selected.includes(m.id)} onCheckedChange={(c) => setSelected((s) => (c ? [...s, m.id] : s.filter((x) => x !== m.id)))} />
                    <MemberAvatar nome={m.nome} className="size-6 text-[10px]" />
                    <span className="truncate">{m.nome}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Pré-visualização</CardTitle></CardHeader>
            <CardContent className="rounded-lg bg-muted/50 p-4 sm:p-8">
              {preview && <div className="mx-auto max-w-3xl shadow-xl"><Certificate m={preview} church={church} tipo={tipo} detalhe={detalhe} data={data} estilo={estilo} /></div>}
            </CardContent>
          </Card>
          <Card className="gap-0 p-0">
            <p className="border-b p-4 font-medium">Emitidos recentemente</p>
            <Table>
              <TableHeader><TableRow><TableHead className="pl-4">Pessoa</TableHead><TableHead>Tipo</TableHead><TableHead className="hidden sm:table-cell">Estilo</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
              <TableBody>
                {certificates.slice(0, 12).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-4">{nomes.get(c.membroId) ?? "—"}</TableCell>
                    <TableCell>{c.tipo}</TableCell>
                    <TableCell className="hidden capitalize sm:table-cell">{c.estilo}</TableCell>
                    <TableCell>{formatDate(c.emitidoEm)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>

      <div className="print-area hidden print:block">
        {escolhidos.map((m) => (
          <div key={m.id} className="print-page">
            <Certificate m={m} church={church} tipo={tipo} detalhe={detalhe} data={data} estilo={estilo} />
          </div>
        ))}
      </div>
    </>
  )
}

export default function CertificadosPage() {
  return (
    <AccessGuard area="certificados" title="Certificados">
      <React.Suspense>
        <CertificadosContent />
      </React.Suspense>
    </AccessGuard>
  )
}
