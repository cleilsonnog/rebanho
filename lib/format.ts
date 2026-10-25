import type { Member, MemberStatus, UserRole } from "./types"

// Data de referência da demonstração. Em produção, troque por `new Date()`.
export const TODAY = new Date("2026-10-24T12:00:00")

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
export const formatBRL = (v: number) => brl.format(v)

export const parseISO = (iso: string) => new Date(`${iso}T12:00:00`)

export const formatDate = (iso?: string) => (iso ? parseISO(iso).toLocaleDateString("pt-BR") : "—")

export const formatDateLong = (iso: string) =>
  parseISO(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })

export const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
export const MONTHS_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

export function age(iso: string, ref = TODAY) {
  const d = parseISO(iso)
  let a = ref.getFullYear() - d.getFullYear()
  const m = ref.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) a--
  return a
}

/** Dias até o próximo aniversário (0 = hoje). */
export function daysUntilBirthday(iso: string, ref = TODAY) {
  const d = parseISO(iso)
  const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  let next = new Date(ref.getFullYear(), d.getMonth(), d.getDate())
  if (next < start) next = new Date(ref.getFullYear() + 1, d.getMonth(), d.getDate())
  return Math.round((next.getTime() - start.getTime()) / 86_400_000)
}

export function initials(nome: string) {
  const parts = nome.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
}

export const STATUS_LABEL: Record<MemberStatus, string> = {
  ativo: "Ativo",
  afastado: "Afastado",
  visitante: "Visitante",
  transferido: "Transferido",
}

export const STATUS_CLASS: Record<MemberStatus, string> = {
  ativo: "bg-success/15 text-success",
  afastado: "bg-highlight/25 text-highlight-foreground dark:text-highlight",
  visitante: "bg-primary/12 text-primary",
  transferido: "bg-muted text-muted-foreground",
}

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  secretaria: "Secretaria",
  tesouraria: "Tesouraria",
  pastor: "Pastor(a)",
  lider: "Líder de célula",
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ["Tudo, inclusive usuários e plano"],
  secretaria: ["Membros", "Visitas", "Células", "Estudo da semana", "Certificados", "Carteirinhas", "Agenda", "Igreja toda ou só uma filial"],
  tesouraria: ["Financeiro", "Relatórios financeiros", "Nomes dos membros, sem endereço ou contato"],
  pastor: ["Membros", "Visitas", "Estudo da semana", "Reuniões de célula", "Mapa", "Aniversários", "Agenda", "Igreja toda ou só uma filial"],
  lider: ["Só as pessoas da sua célula", "Reuniões da célula: presença, visitantes e observações", "Agenda"],
}

export const AGE_BANDS = [
  { label: "0–11", min: 0, max: 11 },
  { label: "12–17", min: 12, max: 17 },
  { label: "18–29", min: 18, max: 29 },
  { label: "30–44", min: 30, max: 44 },
  { label: "45–59", min: 45, max: 59 },
  { label: "60+", min: 60, max: 200 },
]

export const ageBands = (members: Member[]) =>
  AGE_BANDS.map((b) => ({
    faixa: b.label,
    total: members.filter((m) => {
      const a = age(m.nascimento)
      return a >= b.min && a <= b.max
    }).length,
  }))

export const whatsappLink = (telefone: string, texto?: string) =>
  `https://wa.me/55${telefone.replace(/\D/g, "")}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`

/** Cores fixas (hex) para pinos do mapa, onde variáveis CSS não chegam. */
export const STATUS_COLOR: Record<MemberStatus, string> = {
  ativo: "#6d3fd8",
  afastado: "#e8a317",
  visitante: "#1aa39a",
  transferido: "#8a8796",
}

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

/** Segunda-feira da semana da data (aaaa-mm-dd). As semanas vão de segunda a domingo. */
export function inicioDaSemana(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

/** "19/10 a 25/10" */
export function periodoDaSemana(semana: string) {
  const d = new Date(`${semana}T12:00:00Z`)
  const fim = new Date(d.getTime() + 6 * 86_400_000)
  const f = (x: Date) => x.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })
  return `${f(d)} a ${f(fim)}`
}

/** "Quarta · 19:30" */
export const cellSchedule = (c: { diaSemana?: number; horario: string }) =>
  [c.diaSemana !== undefined ? DIAS_SEMANA[c.diaSemana] : "", c.horario].filter(Boolean).join(" · ") || "Dia a definir"

/** Rótulo curto para eixos de gráfico: 12k, 1,5k. */
export const formatAxisBRL = (v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k` : String(v))
