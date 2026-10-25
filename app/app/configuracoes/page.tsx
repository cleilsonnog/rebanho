"use client"

import * as React from "react"
import { Check, Database, Download, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { MemberAvatar } from "@/components/app/member-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
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

function IgrejaTab() {
  const church = useApp((s) => s.church)
  const updateChurch = useApp((s) => s.updateChurch)
  const [c, setC] = React.useState<Church>(church)
  const [nova, setNova] = React.useState("")
  const { errors, pending, submit, invalid } = useFormAction()
  const setEnd = (k: keyof Church["endereco"], v: string) => setC((s) => ({ ...s, endereco: { ...s.endereco, [k]: v } }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit(churchSchema, c, () => updateChurch(c), (salva) => {
          setC(salva)
          toast.success("Dados da igreja salvos")
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
            <Field><FieldLabel htmlFor="cidade">Cidade</FieldLabel><Input {...invalid("endereco.cidade")} id="cidade" value={c.endereco.cidade} onChange={(e) => setEnd("cidade", e.target.value)} /><FieldError>{errors["endereco.cidade"]}</FieldError></Field>
            <Field><FieldLabel htmlFor="uf">UF</FieldLabel><Input {...invalid("endereco.uf")} id="uf" maxLength={2} value={c.endereco.uf} onChange={(e) => setEnd("uf", e.target.value.toUpperCase())} /><FieldError>{errors["endereco.uf"]}</FieldError></Field>
          </FieldGroup>
        </CardContent>
        <CardFooter><Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button></CardFooter>
      </Card>
      <Card className="self-start">
        <CardHeader>
          <CardTitle>Congregações</CardTitle>
          <CardDescription>Salve os dados da igreja para gravar as mudanças.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {c.congregacoes.map((x, i) => (
            <div key={x} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              {x}
              {i > 0 && (
                <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remover ${x}`} onClick={() => setC({ ...c, congregacoes: c.congregacoes.filter((y) => y !== x) })}>
                  <X />
                </Button>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova congregação" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Adicionar"
              onClick={() => {
                if (nova.trim() && !c.congregacoes.includes(nova.trim())) setC({ ...c, congregacoes: [...c.congregacoes, nova.trim()] })
                setNova("")
              }}
            >
              <Plus />
            </Button>
          </div>
          <FieldError>{errors.congregacoes ?? errors["congregacoes.0"]}</FieldError>
        </CardContent>
      </Card>
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
                  const f = new FormData(e.currentTarget)
                  const convite = { nome: String(f.get("nome")), email: String(f.get("email")), papel }
                  submit(inviteSchema, convite, () => addUser(convite), () => {
                    toast.success("Convite enviado por e-mail")
                    setOpen(false)
                  })
                }}
              >
                <FieldGroup>
                  <Field><FieldLabel htmlFor="unome">Nome</FieldLabel><Input {...invalid("nome")} id="unome" name="nome" required /><FieldError>{errors.nome}</FieldError></Field>
                  <Field><FieldLabel htmlFor="uemail">E-mail</FieldLabel><Input {...invalid("email")} id="uemail" name="email" type="email" required /><FieldError>{errors.email}</FieldError></Field>
                  <Field>
                    <FieldLabel>Função</FieldLabel>
                    <Select value={papel} onValueChange={(v) => setPapel(v as UserRole)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(ROLE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
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
  const [carregando, setCarregando] = React.useState(false)

  async function carregarExemplo() {
    if (!confirm("Isso APAGA todos os membros, visitas, lançamentos, eventos e certificados desta igreja e coloca dados de exemplo no lugar. Continuar?")) return
    setCarregando(true)
    if (await notify(loadDemoData(), "Dados de exemplo carregados")) window.location.reload()
    else setCarregando(false)
  }

  function exportar() {
    const { church, members, visits, transactions, events, certificates, users } = store.getState()
    const blob = new Blob([JSON.stringify({ church, members, visits, transactions, events, certificates, users }, null, 2)], { type: "application/json" })
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
          <TabsTrigger value="usuarios">Usuários e acesso</TabsTrigger>
          <TabsTrigger value="plano">Plano</TabsTrigger>
          <TabsTrigger value="dados">Dados</TabsTrigger>
        </TabsList>
        <TabsContent value="igreja"><IgrejaTab /></TabsContent>
        <TabsContent value="usuarios"><UsuariosTab /></TabsContent>
        <TabsContent value="plano"><PlanoTab /></TabsContent>
        <TabsContent value="dados"><DadosTab /></TabsContent>
      </Tabs>
    </>
  )
}
