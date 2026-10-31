import type { Metadata, Viewport } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { CalendarDays, CircleAlert, GraduationCap, HeartHandshake, IdCard, UserRound } from "lucide-react"

import { Logo, LogoMark } from "@/components/brand"
import { LogoImg } from "@/components/app/church-logo"
import { Carteirinha, Certificados, InstalarApp, SairButton } from "@/components/portal/portal-client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PARENTESCO_LABEL, SITUACAO_ALUNO_LABEL, STATUS_LABEL, cellSchedule, formatDate } from "@/lib/format"
import { db } from "@/lib/db"
import { carregarPortal, emailsDoLogin, resolverAcesso } from "@/lib/portal"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Portal do membro",
  robots: { index: false },
  // Instalável no celular (PWA): o manifest é só do portal.
  manifest: "/membro/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Minha igreja", statusBarStyle: "default" },
}

export const viewport: Viewport = { themeColor: "#5f3cc5" }

const ESTADO_CIVIL = { solteiro: "Solteiro(a)", casado: "Casado(a)", divorciado: "Divorciado(a)", viuvo: "Viúvo(a)" }

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6 text-center">
      <Logo />
      <CircleAlert className="size-12 text-muted-foreground" />
      <div className="max-w-sm space-y-2 text-muted-foreground">{children}</div>
      <SairButton />
    </div>
  )
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children || "—"}</p>
    </div>
  )
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ igreja?: string; ver?: string }> }) {
  // Sessão "pendente" (logado, sem igreja escolhida) é o normal aqui: o membro não faz parte da organização.
  const { userId } = await auth({ treatPendingAsSignedOut: false })
  if (!userId) redirect("/membro/entrar")
  const emails = (await emailsDoLogin()) ?? []
  const { igreja, ver } = await searchParams
  const acesso = await resolverAcesso(emails, igreja)

  if (acesso.tipo === "sem-acesso")
    return (
      <Aviso>
        <p className="font-medium text-foreground">Este e-mail não tem acesso ao portal.</p>
        <p>{emails.join(", ") || "Sua conta não tem e-mail confirmado."}</p>
        <p>Procure a secretaria da sua igreja e peça para liberar o portal no seu cadastro, com este e-mail.</p>
      </Aviso>
    )
  if (acesso.tipo === "conflito")
    return (
      <Aviso>
        <p className="font-medium text-foreground">Seu e-mail está em mais de um cadastro na {acesso.igreja}.</p>
        <p>Peça à secretaria para corrigir: o mesmo e-mail só pode ser usado por pessoas da mesma família.</p>
      </Aviso>
    )
  if (acesso.tipo === "escolher")
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6">
        <Logo />
        <Card className="w-full max-w-sm">
          <CardHeader><CardTitle>Qual igreja você quer abrir?</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {acesso.igrejas.map((i) => (
              <Link key={i.id} href={`/membro?igreja=${i.id}`} className="block rounded-lg border p-3 font-medium hover:border-primary/50">{i.nome}</Link>
            ))}
          </CardContent>
        </Card>
        <SairButton />
      </div>
    )

  const pessoa = acesso.visiveis.find((v) => v.id === ver) ?? acesso.visiveis[0]
  const { church, membro: m, celula, escolas, certificados, eventos } = await carregarPortal(acesso.churchId, pessoa.id)
  const daEquipe = (await db.churchUser.count({ where: { clerkUserId: userId, ativo: true } })) > 0
  const h = await headers()
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`
  const link = (id: string) => `/membro?${new URLSearchParams({ ...(igreja && { igreja }), ver: id })}`

  return (
    <div className="min-h-svh bg-muted/40 pb-12">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <LogoImg church={church} className="size-9 rounded" fallback={<LogoMark className="size-9" />} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{church.nome}</p>
            <p className="text-xs text-muted-foreground">Portal do membro</p>
          </div>
          <SairButton />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {acesso.visiveis.length > 1 && (
          <nav aria-label="Pessoas da família" className="flex gap-2 overflow-x-auto pb-1">
            {acesso.visiveis.map((v) => (
              <Link
                key={v.id}
                href={link(v.id)}
                aria-current={v.id === pessoa.id ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full border bg-background px-3 py-1.5 text-sm",
                  v.id === pessoa.id ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50"
                )}
              >
                {v.nome.split(" ")[0]}
                {v.parentesco && <span className="opacity-70"> · {PARENTESCO_LABEL[v.parentesco].toLowerCase()}</span>}
              </Link>
            ))}
          </nav>
        )}

        <InstalarApp />

        <div>
          <h1 className="font-heading text-2xl font-semibold">Olá, {m.nome.split(" ")[0]}!</h1>
          <p className="text-sm text-muted-foreground">{m.cargo} · {m.congregacao} · {STATUS_LABEL[m.status]}</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><IdCard className="size-5 text-primary" /> Carteirinha</CardTitle></CardHeader>
          <CardContent>
            <Carteirinha m={m} church={church} url={`${origin}/verificar/${m.id}`} validade={`12/${new Date().getFullYear() + 1}`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="size-5 text-primary" /> Meus dados</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Info label="Nascimento">{formatDate(m.nascimento)}</Info>
            <Info label="Estado civil">{ESTADO_CIVIL[m.estadoCivil]}</Info>
            <Info label="Telefone">{m.telefone}</Info>
            <Info label="E-mail">{m.email}</Info>
            <div className="col-span-2">
              <Info label="Endereço">
                {m.endereco.rua && `${m.endereco.rua}, ${m.endereco.numero} · ${m.endereco.bairro} · ${m.endereco.cidade}/${m.endereco.uf}`}
              </Info>
            </div>
            <Info label="Membro desde">{formatDate(m.membroDesde)}</Info>
            <Info label="Batismo">{m.batizado ? formatDate(m.dataBatismo) : "Não batizado(a)"}</Info>
            {m.ministerios.length > 0 && (
              <div className="col-span-2 flex flex-wrap gap-1.5">
                {m.ministerios.map((x) => <Badge key={x} variant="secondary">{x}</Badge>)}
              </div>
            )}
            <p className="col-span-2 text-xs text-muted-foreground">Algum dado errado? Fale com a secretaria da igreja para corrigir.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><HeartHandshake className="size-5 text-primary" /> Minha célula</CardTitle></CardHeader>
          <CardContent>
            {!celula ? (
              <p className="text-sm text-muted-foreground">Você ainda não participa de uma célula. Procure a liderança para conhecer uma perto de você.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-semibold">{celula.nome}</p>
                  <p className="text-sm text-muted-foreground">{cellSchedule(celula)}{celula.endereco && ` · ${celula.endereco}`}</p>
                </div>
                {celula.lideres.length > 0 && <Info label="Liderança">{celula.lideres.join(", ")}</Info>}
                {celula.reunioes > 0 && (
                  <Info label="Sua presença nos últimos 12 meses">
                    {celula.presencas} de {celula.reunioes} reuniões ({pct(celula.presencas, celula.reunioes)}%)
                  </Info>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="size-5 text-primary" /> Escolas e certificados</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {escolas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma escola por enquanto.</p>}
            {escolas.map((e) => (
              <div key={e.turmaId} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{e.escola}</p>
                    <p className="text-sm text-muted-foreground">Turma {e.turma}{e.horario && ` · ${e.horario}`}</p>
                  </div>
                  <Badge variant={e.situacao === "concluido" ? "default" : "secondary"}>{SITUACAO_ALUNO_LABEL[e.situacao]}</Badge>
                </div>
                <p className="mt-2 text-sm">
                  {e.aulas > 0 ? `Presença: ${e.presencas} de ${e.aulas} aulas (${pct(e.presencas, e.aulas)}%)` : "Nenhuma aula lançada ainda"}
                  {e.concluidoEm && ` · concluiu em ${formatDate(e.concluidoEm)}`}
                </p>
              </div>
            ))}
            <div>
              <p className="mb-2 text-sm font-medium">Certificados</p>
              <Certificados m={m} church={church} certificados={certificados} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" /> Agenda da igreja</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {eventos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento marcado.</p>}
            {eventos.map((e) => (
              <div key={e.id} className="flex gap-3 rounded-lg border p-3 text-sm">
                <div className="w-14 shrink-0 text-center">
                  <p className="font-semibold">{formatDate(e.data).slice(0, 5)}</p>
                  <p className="text-xs text-muted-foreground">{e.hora}</p>
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{e.titulo}</p>
                  <p className="text-xs text-muted-foreground">{e.local}</p>
                  {e.descricao && <p className="mt-1 text-xs text-muted-foreground">{e.descricao}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Só para quem também é da equipe de alguma igreja (secretaria, pastor…); o membro comum não vê. */}
        {daEquipe && (
          <p className="pt-2 text-center text-xs text-muted-foreground">
            Você também faz parte da equipe. <Link href="/app" className="hover:underline">Ir para o painel da igreja</Link>
          </p>
        )}
      </main>
    </div>
  )
}
