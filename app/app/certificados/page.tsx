"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Printer, Search } from "lucide-react"
import { toast } from "sonner"

import { MemberAvatar } from "@/components/app/member-avatar"
import { PageHeader } from "@/components/app/page-header"
import { LogoMark } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TODAY, formatDate, formatDateLong } from "@/lib/format"
import { TIPOS_CERTIFICADO } from "@/lib/seed"
import { useApp } from "@/lib/store"
import type { CertificateStyle, Church, Member } from "@/lib/types"
import { cn } from "@/lib/utils"

const TEXTO: Record<string, (detalhe: string) => string> = {
  Batismo: (d) => `foi batizado(a) nas águas em nome do Pai, do Filho e do Espírito Santo${d ? `, ${d}` : ""}, conforme Mateus 28:19.`,
  "Apresentação de criança": (d) => `foi apresentado(a) ao Senhor nesta igreja${d ? `, ${d}` : ""}, sendo consagrado(a) em oração pela comunidade.`,
  "Conclusão de curso": (d) => `concluiu com aproveitamento o ${d || "curso oferecido por esta igreja"}.`,
  "Participação em congresso": (d) => `participou do ${d || "congresso realizado por esta igreja"}.`,
  Membresia: () => "é membro desta igreja em plena comunhão, sendo recomendado(a) às igrejas irmãs.",
  Casamento: (d) => `celebrou casamento nesta igreja${d ? ` com ${d}` : ""}, diante de Deus e da comunidade.`,
}

const ESTILOS: { value: CertificateStyle; label: string }[] = [
  { value: "classico", label: "Clássico" },
  { value: "moderno", label: "Moderno" },
  { value: "minimalista", label: "Minimalista" },
]

function Certificate({ m, church, tipo, detalhe, data, estilo }: { m: Member; church: Church; tipo: string; detalhe: string; data: string; estilo: CertificateStyle }) {
  return (
    <div
      className={cn(
        "relative flex aspect-[1.414] w-full flex-col items-center justify-center overflow-hidden bg-white p-[6%] text-center text-neutral-900",
        estilo === "classico" && "border-[10px] border-double border-[#b8862b] font-heading",
        estilo === "moderno" && "border border-neutral-200",
        estilo === "minimalista" && "border border-neutral-200"
      )}
    >
      {estilo === "moderno" && (
        <>
          <div className="absolute inset-y-0 left-0 w-[6%] bg-linear-to-b from-[#5b2fc4] to-[#3a1d86]" />
          <div className="absolute top-0 right-0 size-[22%] rounded-bl-full bg-[#f2b84b]/40" />
        </>
      )}
      <LogoMark className="size-[8%] min-w-6" />
      <p className="mt-[2%] text-[clamp(8px,1.4vw,13px)] tracking-[0.25em] uppercase text-neutral-500">{church.nome}</p>
      <h3 className={cn("mt-[3%] text-[clamp(16px,3.6vw,36px)] font-semibold", estilo === "classico" ? "text-[#8a5f12]" : "text-[#3a1d86]")}>
        Certificado de {tipo}
      </h3>
      <p className="mt-[3%] text-[clamp(8px,1.3vw,13px)] text-neutral-500">Certificamos que</p>
      <p className="mt-[1%] font-heading text-[clamp(14px,3vw,30px)] italic">{m.nome}</p>
      <p className="mt-[2%] max-w-[80%] text-[clamp(8px,1.3vw,13px)] leading-relaxed text-neutral-700">{TEXTO[tipo]?.(detalhe)}</p>
      <p className="mt-[3%] text-[clamp(8px,1.2vw,12px)] text-neutral-500">
        {church.endereco.cidade}, {formatDateLong(data)}
      </p>
      <div className="mt-[5%] flex w-full max-w-[70%] justify-around gap-6 text-[clamp(7px,1.1vw,11px)]">
        <div className="flex-1 border-t border-neutral-400 pt-1">{church.pastor}<br /><span className="text-neutral-500">Pastor presidente</span></div>
        <div className="flex-1 border-t border-neutral-400 pt-1">Secretaria<br /><span className="text-neutral-500">{church.sigla}</span></div>
      </div>
    </div>
  )
}

function CertificadosContent() {
  const params = useSearchParams()
  const members = useApp((s) => s.members)
  const church = useApp((s) => s.church)
  const certificates = useApp((s) => s.certificates)
  const addCertificates = useApp((s) => s.addCertificates)
  const nomes = React.useMemo(() => new Map(members.map((m) => [m.id, m.nome])), [members])

  const [tipo, setTipo] = React.useState<string>(TIPOS_CERTIFICADO[0])
  const [estilo, setEstilo] = React.useState<CertificateStyle>("classico")
  const [detalhe, setDetalhe] = React.useState("")
  const [data, setData] = React.useState(TODAY.toISOString().slice(0, 10))
  const [q, setQ] = React.useState("")
  const [selected, setSelected] = React.useState<string[]>(params.get("membro") ? [params.get("membro")!] : [])

  const lista = members
    .filter((m) => m.status !== "transferido" && m.nome.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  const escolhidos = members.filter((m) => selected.includes(m.id))
  const preview = escolhidos[0] ?? lista[0]

  function emitir() {
    addCertificates(escolhidos.map((m) => ({ membroId: m.id, tipo, estilo, emitidoEm: data, detalhe })))
    toast.success(`${escolhidos.length} certificado(s) registrados`)
    setTimeout(() => window.print(), 100)
  }

  return (
    <>
      <PageHeader title="Certificados" description="Batismo, cursos, congressos e mais, em três estilos, um a um ou em lote.">
        <Button disabled={escolhidos.length === 0} onClick={emitir}>
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
    <React.Suspense>
      <CertificadosContent />
    </React.Suspense>
  )
}
