"use client"

import * as React from "react"
import { Check, Database, Download, ImageUp, Loader2, MapPin, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { ChurchLogo } from "@/components/app/church-logo"
import { FiliaisSettings } from "@/components/app/filiais-settings"
import { PageHeader } from "@/components/app/page-header"
import { MemberAvatar } from "@/components/app/member-avatar"
import { MemberPicker } from "@/components/app/member-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { notify, useFormAction } from "@/hooks/use-form-action"
import { ROLE_LABEL, ROLE_PERMISSIONS } from "@/lib/format"
import { useApp, useAppStore } from "@/lib/store"
import type { Church, UserRole } from "@/lib/types"
import { churchSchema, inviteSchema } from "@/lib/validations"

/** Reduz a imagem para no máximo 512 px antes de enviar: fica leve e cabe no limite das Server Actions. */
async function reduzir(file: File): Promise<Blob> {
  const img = await createImageBitmap(file)
  const escala = Math.min(1, 512 / Math.max(img.width, img.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(img.width * escala)
  canvas.height = Math.round(img.height * escala)
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error("imagem"))), "image/png"))
}

function LogoCard() {
  const temLogo = useApp((s) => Boolean(s.church.logoUrl))
  const updateLogo = useApp((s) => s.updateLogo)
  const removeLogo = useApp((s) => s.removeLogo)
  const [enviando, setEnviando] = React.useState(false)
  const input = React.useRef<HTMLInputElement>(null)

  async function enviar(file?: File) {
    if (!file) return
    if (!file.type.startsWith("image/")) return toast.error("Escolha uma imagem PNG, JPG ou WebP.")
    setEnviando(true)
    try {
      const form = new FormData()
      form.set("logo", new File([await reduzir(file)], "logo.png", { type: "image/png" }))
      await notify(updateLogo(form), "Logo atualizada")
    } catch {
      toast.error("Não foi possível ler essa imagem. Tente outra.")
    } finally {
      setEnviando(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo da igreja</CardTitle>
        <CardDescription>Aparece no menu, nas carteirinhas, nos certificados e no estudo impresso.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
          <ChurchLogo className="size-full p-1" fallback={<ImageUp className="size-6 text-muted-foreground" />} />
        </div>
        <div className="flex flex-col gap-2">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => enviar(e.target.files?.[0])} />
          <Button type="button" variant="outline" size="sm" disabled={enviando} onClick={() => input.current?.click()}>
            {enviando ? <Loader2 className="animate-spin" /> : <ImageUp />} {temLogo ? "Trocar logo" : "Enviar logo"}
          </Button>
          {temLogo && (
            <Button type="button" variant="ghost" size="sm" disabled={enviando} onClick={() => confirm("Remover a logo?") && notify(removeLogo(), "Logo removida")}>
              <Trash2 /> Remover
            </Button>
          )}
          <p className="text-xs text-muted-foreground">PNG com fundo transparente fica melhor.</p>
        </div>
      </CardContent>
    </Card>
  )
}

function IgrejaTab() {
  const church = useApp((s) => s.church)
  const updateChurch = useApp((s) => s.updateChurch)
  const [c, setC] = React.useState<Church>(church)
  const { errors, pending, submit, invalid } = useFormAction()
  const setEnd = (k: keyof Church["endereco"], v: string) => setC((s) => ({ ...s, endereco: { ...s.endereco, [k]: v } }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit(churchSchema, c, () => updateChurch(c), (salva) => {
          setC(salva)
          if (salva.lat !== 0 || salva.lng !== 0) toast.success("Dados salvos. A igreja já aparece no mapa.")
          else toast.warning("Dados salvos, mas não achamos o endereço no mapa. Confira rua, bairro, cidade e CEP.")
        })
      }}
      noValidate
      className="grid gap-4 lg:grid-cols-3"
    >
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Dados da igreja</CardTitle><CardDescription>Aparecem em carteirinhas, certificados e mensagens.</CardDescription></CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2"><FieldLabel htmlFor="nome">Nome</FieldLabel><Input {...invalid("nome")} id="nome" value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} /><FieldError>{errors.nome}</FieldError></Field>
            <Field><FieldLabel htmlFor="sigla">Sigla</FieldLabel><Input {...invalid("sigla")} id="sigla" value={c.sigla} onChange={(e) => setC({ ...c, sigla: e.target.value })} /><FieldError>{errors.sigla}</FieldError></Field>
            <Field><FieldLabel htmlFor="cnpj">CNPJ</FieldLabel><Input {...invalid("cnpj")} id="cnpj" value={c.cnpj} onChange={(e) => setC({ ...c, cnpj: e.target.value })} /><FieldError>{errors.cnpj}</FieldError></Field>
            <Field><FieldLabel htmlFor="pastor">Pastor presidente</FieldLabel><Input {...invalid("pastor")} id="pastor" value={c.pastor} onChange={(e) => setC({ ...c, pastor: e.target.value })} /><FieldError>{errors.pastor}</FieldError></Field>
            <Field><FieldLabel htmlFor="tel">Telefone</FieldLabel><Input {...invalid("telefone")} id="tel" value={c.telefone} onChange={(e) => setC({ ...c, telefone: e.target.value })} /><FieldError>{errors.telefone}</FieldError></Field>
            <Field className="sm:col-span-2"><FieldLabel htmlFor="email">E-mail</FieldLabel><Input {...invalid("email")} id="email" type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} /><FieldError>{errors.email}</FieldError></Field>
            <Field><FieldLabel htmlFor="rua">Endereço</FieldLabel><Input {...invalid("endereco.rua")} id="rua" value={c.endereco.rua} onChange={(e) => setEnd("rua", e.target.value)} /><FieldError>{errors["endereco.rua"]}</FieldError></Field>
            <Field><FieldLabel htmlFor="num">Número</FieldLabel><Input {...invalid("endereco.numero")} id="num" value={c.endereco.numero} onChange={(e) => setEnd("numero", e.target.value)} /><FieldError>{errors["endereco.numero"]}</FieldError></Field>
            <Field><FieldLabel htmlFor="bairro">Bairro</FieldLabel><Input {...invalid("endereco.bairro")} id="bairro" value={c.endereco.bairro} onChange={(e) => setEnd("bairro", e.target.value)} /><FieldError>{errors["endereco.bairro"]}</FieldError></Field>
            <Field><FieldLabel htmlFor="cep">CEP</FieldLabel><Input {...invalid("endereco.cep")} id="cep" inputMode="numeric" placeholder="00000-000" value={c.endereco.cep} onChange={(e) => setEnd("cep", e.target.value)} /><FieldError>{errors["endereco.cep"]}</FieldError></Field>
            <Field><FieldLabel htmlFor="cidade">Cidade</FieldLabel><Input {...invalid("endereco.cidade")} id="cidade" value={c.endereco.cidade} onChange={(e) => setEnd("cidade", e.target.value)} /><FieldError>{errors["endereco.cidade"]}</FieldError></Field>
            <Field><FieldLabel htmlFor="uf">UF</FieldLabel><Input {...invalid("endereco.uf")} id="uf" maxLength={2} value={c.endereco.uf} onChange={(e) => setEnd("uf", e.target.value.toUpperCase())} /><FieldError>{errors["endereco.uf"]}</FieldError></Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-wrap gap-3">
          <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            {church.lat !== 0 || church.lng !== 0 ? "A igreja está no mapa. Os mapas do painel abrem nela." : "Salve o endereço completo para a igreja aparecer no mapa."}
          </span>
        </CardFooter>
      </Card>
      <div className="space-y-4 self-start">
        <LogoCard />
        <Card>
          <CardHeader>
            <CardTitle>Sede e filiais</CardTitle>
            <CardDescription>
              A igreja cadastrada aqui é a sede. Filiais, com endereço e dirigente, ficam na aba Filiais.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </form>
  )
}

function UsuariosTab() {
  const users = useApp((s) => s.users)
  const addUser = useApp((s) => s.addUser)
  const updateUser = useApp((s) => s.updateUser)
  const removeUser = useApp((s) => s.removeUser)
  const me = useApp((s) => s.me)
  const { errors, pending, submit, invalid } = useFormAction()
  const [open, setOpen] = React.useState(false)
  const [papel, setPapel] = React.useState<UserRole>("secretaria")
  const [nome, setNome] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [memberId, setMemberId] = React.useState<string>()
  const [acesso, setAcesso] = React.useState("")
  const filiais = useApp((s) => s.church.congregacoes)
  const temFilial = (p: UserRole) => p === "secretaria" || p === "pastor"
  const members = useApp((s) => s.members)
  const nomeDe = (id?: string) => members.find((m) => m.id === id)?.nome

  function escolherMembro(id: string) {
    const m = members.find((x) => x.id === id)
    setMemberId(id)
    if (m) {
      setNome(m.nome)
      if (m.email) setEmail(m.email)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="gap-0 p-0 lg:col-span-2">
        <div className="flex items-center justify-between border-b p-4">
          <p className="font-medium">Usuários ({users.length})</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus /> Convidar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Convidar usuário</DialogTitle></DialogHeader>
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault()
                  const convite = {
                    nome,
                    email,
                    papel,
                    memberId: papel === "lider" ? memberId : undefined,
                    congregacao: temFilial(papel) ? acesso : undefined,
                  }
                  submit(inviteSchema, convite, () => addUser(convite), () => {
                    toast.success("Convite enviado por e-mail")
                    setOpen(false)
                    setNome("")
                    setEmail("")
                    setMemberId(undefined)
                    setAcesso("")
                  })
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel>Função</FieldLabel>
                    <Select value={papel} onValueChange={(v) => setPapel(v as UserRole)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(ROLE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  {temFilial(papel) && filiais.length > 1 && (
                    <Field>
                      <FieldLabel>Acesso</FieldLabel>
                      <Select value={acesso || "toda"} onValueChange={(v) => setAcesso(v === "toda" ? "" : v)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="toda">Igreja toda (sede e filiais)</SelectItem>
                          {filiais.map((f) => <SelectItem key={f} value={f}>Só {f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FieldDescription>Restrito a uma filial, só vê os membros, as células e as visitas dela.</FieldDescription>
                    </Field>
                  )}
                  {papel === "lider" && (
                    <Field>
                      <FieldLabel>Cadastro de membro do líder</FieldLabel>
                      <MemberPicker value={memberId} onChange={escolherMembro} placeholder="Quem é o líder no cadastro" />
                      <FieldDescription>Ele verá e cuidará só das células em que for líder ou colíder.</FieldDescription>
                      <FieldError>{errors.memberId}</FieldError>
                    </Field>
                  )}
                  <Field><FieldLabel htmlFor="unome">Nome</FieldLabel><Input {...invalid("nome")} id="unome" value={nome} onChange={(e) => setNome(e.target.value)} required /><FieldError>{errors.nome}</FieldError></Field>
                  <Field><FieldLabel htmlFor="uemail">E-mail</FieldLabel><Input {...invalid("email")} id="uemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /><FieldError>{errors.email}</FieldError></Field>
                </FieldGroup>
                <DialogFooter className="mt-6"><Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar convite"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead className="pl-4">Usuário</TableHead><TableHead>Função</TableHead><TableHead>Ativo</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <MemberAvatar nome={u.nome} className="size-8" />
                    <div>
                      <p className="font-medium">{u.nome} {u.pendente && <Badge variant="outline" className="ml-1">Convite pendente</Badge>}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Select value={u.papel} onValueChange={(v) => notify(updateUser(u.id, { papel: v as UserRole }), "Função alterada")} disabled={u.id === me.id}>
                    <SelectTrigger size="sm" className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ROLE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                  {temFilial(u.papel) && filiais.length > 1 && (
                    <Select
                      value={u.congregacao ?? "toda"}
                      onValueChange={(v) => notify(updateUser(u.id, { congregacao: v === "toda" ? null : v }), v === "toda" ? "Acesso à igreja toda" : `Acesso só a ${v}`)}
                      disabled={u.id === me.id}
                    >
                      <SelectTrigger size="sm" className="mt-1.5 w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="toda">Igreja toda</SelectItem>
                        {filiais.map((f) => <SelectItem key={f} value={f}>Só {f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {u.papel === "lider" && (
                    <div className="mt-1.5 w-44">
                      <MemberPicker
                        value={u.memberId}
                        onChange={(id) => notify(updateUser(u.id, { memberId: id }), `Ligado ao cadastro de ${nomeDe(id)}`)}
                        placeholder="Ligar ao cadastro"
                      />
                    </div>
                  )}
                </TableCell>
                <TableCell><Switch checked={u.ativo} disabled={u.id === me.id} onCheckedChange={(v) => notify(updateUser(u.id, { ativo: v }), v ? "Acesso reativado" : "Acesso desativado")} /></TableCell>
                <TableCell>
                  {u.id !== me.id && (
                    <Button variant="ghost" size="icon-sm" aria-label="Remover" onClick={() => confirm(`Remover ${u.nome}?`) && notify(removeUser(u.id), "Usuário removido")}><Trash2 /></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card className="self-start">
        <CardHeader><CardTitle>Níveis de acesso</CardTitle><CardDescription>Cada função vê só o que precisa.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
            <div key={r}>
              <p className="text-sm font-medium">{ROLE_LABEL[r]}</p>
              <p className="text-xs text-muted-foreground">{ROLE_PERMISSIONS[r].join(" · ")}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function PlanoTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>Teste grátis</CardTitle><CardDescription>14 dias restantes</CardDescription></CardHeader>
        <CardContent>
          <Progress value={0} />
          <p className="mt-3 text-sm text-muted-foreground">Tudo liberado durante o teste. Escolha um plano para continuar depois.</p>
        </CardContent>
      </Card>
      {[
        { nome: "Anual", preco: "R$ 470/ano", extra: "12x de R$ 39,17 · economize R$ 118", destaque: true },
        { nome: "Mensal", preco: "R$ 49/mês", extra: "Sem fidelidade", destaque: false },
      ].map((p) => (
        <Card key={p.nome} className={p.destaque ? "border-primary ring-1 ring-primary" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">{p.nome} {p.destaque && <Badge className="bg-highlight text-highlight-foreground">Mais escolhido</Badge>}</CardTitle>
            <p className="font-heading text-3xl font-semibold">{p.preco}</p>
            <CardDescription>{p.extra}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {["Membros ilimitados", "Todas as funcionalidades", "Cartão, Pix ou boleto"].map((i) => (
              <p key={i} className="flex gap-2"><Check className="size-4 text-success" />{i}</p>
            ))}
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant={p.destaque ? "default" : "outline"} onClick={() => toast.info("Integre um gateway (ex.: Stripe, Asaas ou Mercado Pago) para cobrar.")}>
              Assinar {p.nome.toLowerCase()}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

function DadosTab() {
  const store = useAppStore()
  const loadDemoData = useApp((s) => s.loadDemoData)
  const clearData = useApp((s) => s.clearData)
  const [carregando, setCarregando] = React.useState(false)
  const [apagar, setApagar] = React.useState(false)
  const [confirmacao, setConfirmacao] = React.useState("")

  async function apagarTudo() {
    setCarregando(true)
    if (await notify(clearData(confirmacao), "Dados apagados")) window.location.reload()
    else setCarregando(false)
  }

  async function carregarExemplo() {
    if (!confirm("Isso APAGA todos os membros, células, visitas, lançamentos, eventos e certificados desta igreja e coloca dados de exemplo no lugar. Continuar?")) return
    setCarregando(true)
    if (await notify(loadDemoData(), "Dados de exemplo carregados")) window.location.reload()
    else setCarregando(false)
  }

  function exportar() {
    const { church, members, visits, transactions, events, certificates, cells, cellMeetings, cellStudies, users } = store.getState()
    const dados = { church, members, visits, transactions, events, certificates, cells, cellMeetings, cellStudies, users }
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rebanho-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Exportar dados</CardTitle><CardDescription>Baixe uma cópia completa de tudo o que está cadastrado (LGPD: portabilidade).</CardDescription></CardHeader>
        <CardFooter><Button variant="outline" onClick={exportar}><Download /> Baixar backup (JSON)</Button></CardFooter>
      </Card>
      <Card>
        <CardHeader><CardTitle>Dados de exemplo</CardTitle><CardDescription>Para testar o sistema: troca todos os dados desta igreja por 148 membros fictícios.</CardDescription></CardHeader>
        <CardFooter>
          <Button variant="destructive" disabled={carregando} onClick={carregarExemplo}>
            <Database /> {carregando ? "Carregando…" : "Carregar dados de exemplo"}
          </Button>
        </CardFooter>
      </Card>
      <Card className="border-destructive/40 md:col-span-2">
        <CardHeader>
          <CardTitle>Apagar dados</CardTitle>
          <CardDescription>
            Apaga membros, células, estudos, visitas, financeiro, agenda e certificados, como os dados de exemplo. O cadastro
            da igreja, a logo e os usuários continuam. Não dá para desfazer: baixe o backup antes, se precisar.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Dialog open={apagar} onOpenChange={(o) => { setApagar(o); setConfirmacao("") }}>
            <DialogTrigger asChild><Button variant="destructive" disabled={carregando}><Trash2 /> Apagar dados da igreja</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Apagar todos os dados?</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">
                Tudo o que foi cadastrado será apagado para sempre. Para confirmar, digite <strong className="text-foreground">APAGAR</strong>.
              </p>
              <Input autoFocus value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} placeholder="APAGAR" aria-label="Confirmação" />
              <DialogFooter>
                <Button variant="outline" onClick={() => setApagar(false)}>Cancelar</Button>
                <Button variant="destructive" disabled={confirmacao !== "APAGAR" || carregando} onClick={apagarTudo}>
                  {carregando ? "Apagando…" : "Apagar para sempre"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function ConfiguracoesPage() {
  const papel = useApp((s) => s.me.papel)

  if (papel !== "admin")
    return (
      <>
        <PageHeader title="Configurações" />
        <Card><CardContent className="py-12 text-center text-muted-foreground">Só o administrador da igreja acessa esta página.</CardContent></Card>
      </>
    )

  return (
    <>
      <PageHeader title="Configurações" />
      <Tabs defaultValue="igreja">
        <TabsList className="flex-wrap">
          <TabsTrigger value="igreja">Igreja</TabsTrigger>
          <TabsTrigger value="filiais">Filiais</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários e acesso</TabsTrigger>
          <TabsTrigger value="plano">Plano</TabsTrigger>
          <TabsTrigger value="dados">Dados</TabsTrigger>
        </TabsList>
        <TabsContent value="igreja"><IgrejaTab /></TabsContent>
        <TabsContent value="filiais" className="mt-4"><FiliaisSettings /></TabsContent>
        <TabsContent value="usuarios"><UsuariosTab /></TabsContent>
        <TabsContent value="plano"><PlanoTab /></TabsContent>
        <TabsContent value="dados"><DadosTab /></TabsContent>
      </Tabs>
    </>
  )
}
