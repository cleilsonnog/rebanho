"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Award, CalendarClock, HeartHandshake, IdCard, MapPin, MessageCircle, Pencil, Phone, Mail } from "lucide-react"

import { MemberAvatar, StatusBadge } from "@/components/app/member-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { age, formatBRL, formatDate, whatsappLink } from "@/lib/format"
import { canWrite } from "@/lib/permissions"
import { useApp, useMember } from "@/lib/store"

const ESTADO_CIVIL = { solteiro: "Solteiro(a)", casado: "Casado(a)", divorciado: "Divorciado(a)", viuvo: "Viúvo(a)" }

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children || "—"}</p>
    </div>
  )
}

export default function MembroPage() {
  const { id } = useParams<{ id: string }>()
  const m = useMember(id)
  const visits = useApp((s) => s.visits)
  const transactions = useApp((s) => s.transactions)
  const certificates = useApp((s) => s.certificates)
  const celula = useApp((s) => s.cells.find((c) => c.membroIds.includes(id)))
  const podeEditar = useApp((s) => canWrite(s.me.papel, "membros"))

  if (!m)
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Membro não encontrado.</p>
        <Button variant="outline" className="mt-4" asChild><Link href="/app/membros">Voltar</Link></Button>
      </div>
    )

  const minhasVisitas = visits.filter((v) => v.membroId === m.id)
  const meusDizimos = transactions.filter((t) => t.membroId === m.id)
  const meusCertificados = certificates.filter((c) => c.membroId === m.id)
  const totalAno = meusDizimos.reduce((a, t) => a + t.valor, 0)

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link href="/app/membros"><ArrowLeft /> Membros</Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-6 md:flex-row md:items-center">
          <MemberAvatar nome={m.nome} className="size-20 text-2xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold md:text-3xl">{m.nome}</h1>
              <StatusBadge status={m.status} />
            </div>
            <p className="mt-1 text-muted-foreground">
              {m.cargo} · {m.congregacao} · {age(m.nascimento)} anos
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {m.ministerios.map((x) => <Badge key={x} variant="secondary">{x}</Badge>)}
              {m.batizado && <Badge variant="outline">Batizado(a)</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={whatsappLink(m.telefone)} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>
            </Button>
            <Button variant="outline" asChild><Link href={`/app/carteirinhas?membro=${m.id}`}><IdCard /> Carteirinha</Link></Button>
            {podeEditar && <Button asChild><Link href={`/app/membros/${m.id}/editar`}><Pencil /> Editar</Link></Button>}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dados" className="mt-6">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="visitas">Visitas ({minhasVisitas.length})</TabsTrigger>
          <TabsTrigger value="contribuicoes">Contribuições</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Informações</CardTitle></CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-3">
              <Info label="Nascimento">{formatDate(m.nascimento)}</Info>
              <Info label="Sexo">{m.sexo === "F" ? "Feminino" : "Masculino"}</Info>
              <Info label="Estado civil">{ESTADO_CIVIL[m.estadoCivil]}</Info>
              <Info label="Membro desde">{formatDate(m.membroDesde)}</Info>
              <Info label="Batismo">{m.batizado ? formatDate(m.dataBatismo) : "Não batizado(a)"}</Info>
              <Info label="Congregação">{m.congregacao}</Info>
              <Info label="Célula">
                {celula && <Link href={`/app/celulas/${celula.id}`} className="hover:underline">{celula.nome}</Link>}
              </Info>
              {m.observacoes && (
                <div className="sm:col-span-3">
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p className="text-sm whitespace-pre-wrap">{m.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Contato</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" /> {m.telefone}</p>
              <p className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" /> {m.email || "—"}</p>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  {m.endereco.rua}, {m.endereco.numero}<br />
                  {m.endereco.bairro} · {m.endereco.cidade}/{m.endereco.uf}<br />
                  CEP {m.endereco.cep}
                </span>
              </p>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/app/mapa?membro=${m.id}`}>Ver no mapa</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visitas">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Histórico de visitas</CardTitle>
              <Button size="sm" asChild><Link href={`/app/visitas?nova=1&membro=${m.id}`}><HeartHandshake /> Registrar visita</Link></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {minhasVisitas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma visita registrada.</p>}
              {minhasVisitas.map((v) => (
                <div key={v.id} className="border-l-2 border-primary/40 pl-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{formatDate(v.data)}</p>
                    <Badge variant="secondary">{v.motivo}</Badge>
                    <span className="text-xs text-muted-foreground">por {v.responsavel}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{v.notas}</p>
                  {v.proximaVisita && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-primary">
                      <CalendarClock className="size-3.5" /> Próxima visita: {formatDate(v.proximaVisita)}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contribuicoes">
          <Card>
            <CardHeader>
              <CardTitle>Dízimos em 2026</CardTitle>
              <p className="text-sm text-muted-foreground">{meusDizimos.length} lançamentos · total {formatBRL(totalAno)}</p>
            </CardHeader>
            <CardContent>
              {meusDizimos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma contribuição vinculada a esta pessoa.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Data</TableHead><TableHead>Categoria</TableHead><TableHead>Forma</TableHead><TableHead className="text-right">Valor</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {meusDizimos.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{formatDate(t.data)}</TableCell>
                        <TableCell>{t.categoria}</TableCell>
                        <TableCell className="capitalize">{t.formaPagamento}</TableCell>
                        <TableCell className="text-right font-mono">{formatBRL(t.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Certificados emitidos</CardTitle>
              <Button size="sm" variant="outline" asChild><Link href={`/app/certificados?membro=${m.id}`}><Award /> Emitir certificado</Link></Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {meusCertificados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum certificado emitido.</p>}
              {meusCertificados.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span className="font-medium">{c.tipo}</span>
                  <span className="text-muted-foreground">{formatDate(c.emitidoEm)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
