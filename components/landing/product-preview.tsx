"use client"

import { BadgeCheck, CalendarClock, Paperclip, Search } from "lucide-react"

import { LogoMark } from "@/components/brand"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const barras = [38, 52, 44, 61, 58, 72, 66, 80, 74, 88]

function Window({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-primary/10">
      <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-highlight" />
        <span className="size-2.5 rounded-full bg-success/70" />
        <span className="ml-3 truncate text-xs text-muted-foreground">app.rebanho.com.br · Igreja Comunidade Monte Hermom</span>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-success">{hint}</p>}
    </div>
  )
}

export function ProductPreview() {
  return (
    <Tabs defaultValue="painel" className="gap-6">
      <TabsList className="mx-auto flex h-auto flex-wrap justify-center">
        <TabsTrigger value="painel">Painel</TabsTrigger>
        <TabsTrigger value="membros">Membros</TabsTrigger>
        <TabsTrigger value="visitas">Visitas</TabsTrigger>
        <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        <TabsTrigger value="carteirinha">Carteirinha</TabsTrigger>
      </TabsList>

      <TabsContent value="painel">
        <Window>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Membros" value="512" hint="+18 este mês" />
            <Stat label="Congregações" value="3" />
            <Stat label="Batizados" value="384" />
            <Stat label="Visitantes no mês" value="31" hint="+7 vs. setembro" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-background p-4 md:col-span-2">
              <p className="text-sm font-medium">Crescimento em 2026</p>
              <div className="mt-4 flex h-36 items-end gap-2">
                {barras.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-md bg-primary/80" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-background p-4">
              <p className="text-sm font-medium">Aniversariantes da semana</p>
              <ul className="mt-3 space-y-2 text-sm">
                {["Rebeca Lima · hoje", "Davi Santos · sáb", "Noemi Alves · dom", "Tiago Rocha · ter"].map((n) => (
                  <li key={n} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-highlight" /> {n}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Window>
      </TabsContent>

      <TabsContent value="membros">
        <Window>
          <div className="mb-3 flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
            <Search className="size-4" /> Buscar por nome, telefone ou bairro…
          </div>
          <div className="divide-y rounded-xl border bg-background text-sm">
            {[
              ["Ana Ribeiro", "Sede", "Diaconisa", "Ativo"],
              ["Lucas Ferreira", "Congregação Leste", "Líder de Jovens", "Ativo"],
              ["Marta Gomes", "Sede", "Membro", "Afastado"],
              ["Samuel Costa", "Congregação Sul", "Presbítero", "Ativo"],
              ["Priscila Dias", "Sede", "Visitante", "Visitante"],
            ].map(([nome, cong, cargo, status]) => (
              <div key={nome} className="grid grid-cols-[1fr_auto] items-center gap-2 px-4 py-3 sm:grid-cols-4">
                <span className="font-medium">{nome}</span>
                <span className="hidden text-muted-foreground sm:block">{cong}</span>
                <span className="hidden text-muted-foreground sm:block">{cargo}</span>
                <Badge variant={status === "Ativo" ? "default" : "secondary"} className="justify-self-end sm:justify-self-start">
                  {status}
                </Badge>
              </div>
            ))}
          </div>
        </Window>
      </TabsContent>

      <TabsContent value="visitas">
        <Window>
          <div className="space-y-3">
            {[
              ["Família Nascimento", "Pr. Samuel · 21/10", "Irmã em recuperação de cirurgia. Combinamos carona para o culto de domingo.", "04/11"],
              ["Jonas Barbosa", "Pb. André · 17/10", "Afastado há 3 meses por causa do trabalho em turnos. Pediu oração.", "18/11"],
            ].map(([quem, meta, nota, prox]) => (
              <div key={quem} className="rounded-xl border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{quem}</p>
                  <span className="text-xs text-muted-foreground">{meta}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{nota}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground"><Paperclip className="size-3.5" /> 2 fotos</span>
                  <span className="flex items-center gap-1 text-primary"><CalendarClock className="size-3.5" /> Próxima visita {prox}</span>
                </div>
              </div>
            ))}
          </div>
        </Window>
      </TabsContent>

      <TabsContent value="financeiro">
        <Window>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Entradas (ano)" value="R$ 96.410" />
            <Stat label="Saídas (ano)" value="R$ 41.287" />
            <Stat label="Saldo" value="R$ 55.123" hint="Saudável" />
          </div>
          <div className="mt-4 rounded-xl border bg-background p-4">
            <p className="text-sm font-medium">Entradas por categoria</p>
            {[
              ["Dízimos", 68],
              ["Ofertas", 21],
              ["Campanhas", 8],
              ["Missões", 3],
            ].map(([label, pct]) => (
              <div key={label} className="mt-3">
                <div className="flex justify-between text-xs"><span>{label}</span><span className="text-muted-foreground">{pct}%</span></div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Window>
      </TabsContent>

      <TabsContent value="carteirinha">
        <Window>
          <div className="mx-auto max-w-sm overflow-hidden rounded-2xl bg-linear-to-br from-primary to-primary/70 p-5 text-primary-foreground shadow-lg">
            <div className="flex items-center gap-2">
              <LogoMark className="size-7 [&_rect]:fill-primary-foreground/20" />
              <p className="text-sm font-semibold">Igreja Comunidade Monte Hermom</p>
            </div>
            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs opacity-80">Membro</p>
                <p className="font-heading text-xl font-semibold">Ana Ribeiro</p>
                <p className="mt-2 text-xs opacity-80">Diaconisa · Membro desde 2015</p>
                <p className="mt-3 flex items-center gap-1 text-xs font-medium text-highlight">
                  <BadgeCheck className="size-4" /> Ativa · válida até 12/2027
                </p>
              </div>
              <div className="grid size-20 grid-cols-5 gap-0.5 rounded-lg bg-white p-2">
                {Array.from({ length: 25 }, (_, i) => (
                  <span key={i} className={(i * 7) % 3 ? "bg-black" : "bg-white"} />
                ))}
              </div>
            </div>
          </div>
        </Window>
      </TabsContent>
    </Tabs>
  )
}
