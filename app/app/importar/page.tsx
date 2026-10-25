"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Camera, Download, FileSpreadsheet, Loader2, ScanText, Upload } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TODAY } from "@/lib/format"
import { canWrite } from "@/lib/permissions"
import { useApp, useCongregacoesPermitidas } from "@/lib/store"
import type { Endereco, Member } from "@/lib/types"
import { memberSchema } from "@/lib/validations"

const CAMPOS = [
  { key: "nome", label: "Nome", aliases: ["nome", "nome completo", "membro"] },
  { key: "telefone", label: "Telefone", aliases: ["telefone", "celular", "whatsapp", "fone"] },
  { key: "email", label: "E-mail", aliases: ["email", "e-mail"] },
  { key: "nascimento", label: "Nascimento", aliases: ["nascimento", "data de nascimento", "aniversario", "aniversário"] },
  { key: "sexo", label: "Sexo", aliases: ["sexo", "genero", "gênero"] },
  { key: "bairro", label: "Bairro", aliases: ["bairro"] },
  { key: "rua", label: "Endereço", aliases: ["endereco", "endereço", "rua", "logradouro"] },
  { key: "cargo", label: "Cargo", aliases: ["cargo", "função", "funcao"] },
] as const
type CampoKey = (typeof CAMPOS)[number]["key"]

function parseCSV(text: string) {
  const sep = (text.split("\n")[0].match(/;/g)?.length ?? 0) > (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ","
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === sep) { row.push(cell.trim()); cell = "" }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(cell.trim()); cell = ""
      if (row.some(Boolean)) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

/** Aceita dd/mm/aaaa ou aaaa-mm-dd. */
function toISO(v: string) {
  const br = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "2000-01-01"
}

/** A cidade da igreja entra como padrão; a posição no mapa é calculada depois, no servidor, pelo bairro. */
function buildMember(get: (k: CampoKey) => string, congregacao: string, igreja: Endereco): Omit<Member, "id"> {
  const bairro = get("bairro")
  return {
    nome: get("nome"),
    sexo: /^f/i.test(get("sexo")) ? "F" : "M",
    nascimento: toISO(get("nascimento")),
    telefone: get("telefone"),
    email: get("email"),
    estadoCivil: "solteiro",
    endereco: { rua: get("rua"), numero: "", bairro, cidade: igreja.cidade, uf: igreja.uf, cep: "" },
    lat: 0,
    lng: 0,
    congregacao,
    cargo: get("cargo") || "Membro",
    ministerios: [],
    status: "ativo",
    batizado: false,
    membroDesde: TODAY.toISOString().slice(0, 10),
  }
}

const MODELO = "Nome;Telefone;E-mail;Nascimento;Sexo;Bairro;Endereço;Cargo\nMaria da Silva;(62) 99999-0000;maria@email.com;12/05/1985;F;Setor Bueno;Rua T-30, 120;Membro\n"

function Planilha() {
  const router = useRouter()
  const addMembers = useApp((s) => s.addMembers)
  const congregacoes = useCongregacoesPermitidas()
  const enderecoIgreja = useApp((s) => s.church.endereco)
  const [rows, setRows] = React.useState<string[][]>([])
  const [map, setMap] = React.useState<Record<CampoKey, number>>({} as Record<CampoKey, number>)
  const [cong, setCong] = React.useState(congregacoes[0] ?? "")
  const [pending, setPending] = React.useState(false)
  const header = rows[0] ?? []
  const body = rows.slice(1).filter((r) => r[map.nome] ?? "")

  async function onFile(file: File) {
    const parsed = parseCSV(await file.text())
    if (parsed.length < 2) return toast.error("A planilha precisa de um cabeçalho e ao menos uma linha")
    setRows(parsed)
    const auto = {} as Record<CampoKey, number>
    for (const c of CAMPOS) {
      const idx = parsed[0].findIndex((h) => (c.aliases as readonly string[]).includes(h.toLowerCase().trim()))
      auto[c.key] = idx
    }
    setMap(auto)
  }

  async function importar() {
    if (map.nome == null || map.nome < 0) return toast.error("Indique qual coluna tem o nome")
    const ms = body.map((r) => buildMember((k) => (map[k] >= 0 ? r[map[k]] ?? "" : ""), cong, enderecoIgreja))

    // Valida linha a linha: importa as válidas e informa as que ficaram de fora (linha 1 é o cabeçalho).
    const validas: typeof ms = []
    const erros: string[] = []
    ms.forEach((m, i) => {
      const r = memberSchema.safeParse(m)
      if (r.success) validas.push(m)
      else erros.push(`Linha ${i + 2}: ${r.error.issues[0].message}`)
    })
    if (validas.length === 0) return toast.error("Nenhuma linha válida", { description: erros.slice(0, 5).join(" · ") })

    setPending(true)
    const r = await addMembers(validas).finally(() => setPending(false))
    if (!r.ok) return toast.error(r.error)
    toast.success(`${r.data.length} pessoas importadas`)
    if (erros.length)
      toast.warning(`${erros.length} linha(s) ignorada(s)`, {
        description: erros.slice(0, 5).join(" · ") + (erros.length > 5 ? " …" : ""),
        duration: 15_000,
      })
    router.push("/app/membros")
  }

  function baixarModelo() {
    const url = URL.createObjectURL(new Blob(["﻿" + MODELO], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "modelo-membros.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (rows.length === 0)
    return (
      <Card>
        <CardContent className="py-6">
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition hover:border-primary hover:bg-primary/5">
            <FileSpreadsheet className="size-12 text-primary" />
            <p className="font-medium">Arraste ou clique para escolher a planilha</p>
            <p className="text-sm text-muted-foreground">Arquivo CSV (no Excel: Salvar como › CSV). Separador vírgula ou ponto e vírgula.</p>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <div className="mt-4 text-center">
            <Button variant="link" onClick={baixarModelo}><Download /> Baixar planilha modelo</Button>
          </div>
        </CardContent>
      </Card>
    )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ligue as colunas aos campos</CardTitle>
          <CardDescription>Detectamos automaticamente o que deu. Confira antes de importar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAMPOS.map((c) => (
            <Field key={c.key}>
              <FieldLabel>{c.label}</FieldLabel>
              <Select value={String(map[c.key] ?? -1)} onValueChange={(v) => setMap((m) => ({ ...m, [c.key]: Number(v) }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="-1">— Ignorar —</SelectItem>
                  {header.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Coluna ${i + 1}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          ))}
          <Field>
            <FieldLabel>Congregação</FieldLabel>
            <Select value={cong} onValueChange={setCong}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{congregacoes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>
      <Card className="gap-0 p-0">
        <div className="flex items-center justify-between border-b p-4">
          <p className="font-medium">Pré-visualização <Badge variant="secondary" className="ml-2">{body.length} pessoas</Badge></p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRows([])}>Trocar arquivo</Button>
            <Button onClick={importar} disabled={pending}><Upload /> {pending ? "Importando…" : `Importar ${body.length}`}</Button>
          </div>
        </div>
        <div className="max-h-96 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>{CAMPOS.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {body.slice(0, 50).map((r, i) => (
                <TableRow key={i}>
                  {CAMPOS.map((c) => <TableCell key={c.key}>{map[c.key] >= 0 ? r[map[c.key]] : <span className="text-muted-foreground">—</span>}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

function Foto() {
  const addMember = useApp((s) => s.addMember)
  const congregacoes = useCongregacoesPermitidas()
  const enderecoIgreja = useApp((s) => s.church.endereco)
  const [img, setImg] = React.useState<string>()
  const [lendo, setLendo] = React.useState(false)
  const [campos, setCampos] = React.useState<Record<CampoKey, string> | null>(null)

  function onFile(file: File) {
    setImg(URL.createObjectURL(file))
    setLendo(true)
    setCampos(null)
    // Demonstração: simula a leitura da ficha. Em produção, envie a imagem para um modelo de visão (ex.: Claude) e preencha com a resposta.
    setTimeout(() => {
      setCampos({ nome: "Rute Almeida Barbosa", telefone: "(62) 98123-4567", email: "", nascimento: "1979-03-14", sexo: "F", bairro: "Vila Nova", rua: "Rua 220, 45", cargo: "Membro" })
      setLendo(false)
    }, 1800)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!campos) return
    const m = buildMember((k) => campos[k], congregacoes[0] ?? "", enderecoIgreja)
    const erro = memberSchema.safeParse(m).error?.issues[0]
    if (erro) return toast.error(erro.message)
    const r = await addMember(m)
    if (!r.ok) return toast.error(r.error)
    toast.success(`${r.data.nome} cadastrado(a) a partir da foto`)
    setImg(undefined)
    setCampos(null)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>1. Fotografe a ficha</CardTitle><CardDescription>No celular, a câmera abre direto.</CardDescription></CardHeader>
        <CardContent>
          {img ? (
            <div className="relative overflow-hidden rounded-xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="Ficha enviada" className="max-h-96 w-full object-contain" />
              {lendo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 backdrop-blur-sm">
                  <ScanText className="size-10 animate-pulse text-primary" />
                  <p className="text-sm font-medium">Lendo os campos…</p>
                </div>
              )}
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition hover:border-primary hover:bg-primary/5">
              <Camera className="size-12 text-primary" />
              <p className="font-medium">Tirar foto ou escolher imagem</p>
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            </label>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>2. Confira e salve</CardTitle><CardDescription>Corrija o que precisar antes de gravar.</CardDescription></CardHeader>
        <CardContent>
          {!campos ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              {lendo ? <Loader2 className="animate-spin" /> : "Os campos lidos aparecem aqui."}
            </div>
          ) : (
            <form onSubmit={salvar}>
              <FieldGroup className="grid gap-3 sm:grid-cols-2">
                {CAMPOS.map((c) => (
                  <Field key={c.key} className={c.key === "nome" ? "sm:col-span-2" : ""}>
                    <FieldLabel htmlFor={c.key}>{c.label}</FieldLabel>
                    <Input id={c.key} type={c.key === "nascimento" ? "date" : "text"} value={campos[c.key]} onChange={(e) => setCampos({ ...campos, [c.key]: e.target.value })} />
                  </Field>
                ))}
              </FieldGroup>
              <div className="mt-6 flex gap-2">
                <Button type="button" variant="outline" onClick={() => { setImg(undefined); setCampos(null) }}>Descartar</Button>
                <Button type="submit" className="flex-1">Salvar e próxima ficha</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ImportarPage() {
  const pode = useApp((s) => canWrite(s.me.papel, "membros"))
  if (!pode)
    return (
      <>
        <PageHeader title="Importar membros" />
        <Card><CardContent className="py-12 text-center text-muted-foreground">Sua função não permite cadastrar membros.</CardContent></Card>
      </>
    )

  return (
    <>
      <PageHeader title="Importar membros" description="Traga a lista que você já tem: planilha ou foto das fichas de papel." />
      <Tabs defaultValue="planilha">
        <TabsList>
          <TabsTrigger value="planilha"><FileSpreadsheet /> Planilha</TabsTrigger>
          <TabsTrigger value="foto"><Camera /> Foto da ficha</TabsTrigger>
        </TabsList>
        <TabsContent value="planilha"><Planilha /></TabsContent>
        <TabsContent value="foto"><Foto /></TabsContent>
      </Tabs>
    </>
  )
}
