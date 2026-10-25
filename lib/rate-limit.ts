import "server-only"

import { headers } from "next/headers"

import { ActionError } from "./church"
import { db } from "./db"

// Rate limit de janela fixa guardado no Postgres: funciona com vários servidores ao mesmo tempo
// (um contador em memória não). Para volume alto, trocar só este arquivo por Redis (ex.: Upstash).

export const LIMITES = {
  /** Qualquer Server Action, por usuário. */
  escrita: { max: 60, segundos: 60 },
  /** Convites por e-mail, por igreja (o Clerk aceita 250/hora para o app inteiro). */
  convite: { max: 10, segundos: 3600 },
  /** Importação de planilha (até 1000 linhas cada), por usuário. */
  importacao: { max: 10, segundos: 3600 },
  /** Apagar tudo e carregar dados de exemplo, por igreja. */
  demo: { max: 3, segundos: 3600 },
  /** Busca da posição de um endereço no mapa (serviços grátis com uso justo), por igreja. */
  geocodificacao: { max: 20, segundos: 60 },
  /** Página pública da carteirinha, por IP. */
  verificar: { max: 30, segundos: 60 },
} as const

export type Limite = keyof typeof LIMITES

/** Conta mais uma tentativa e diz se ainda está dentro do limite. */
export async function rateLimit(tipo: Limite, id: string) {
  const { max, segundos } = LIMITES[tipo]
  const janela = segundos * 1000
  const inicio = Math.floor(Date.now() / janela) * janela

  // Um único comando atômico: cria o contador da janela ou soma 1 e devolve o total.
  const [{ count }] = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count")
    VALUES (${`${tipo}:${id}`}, ${new Date(inicio)}, 1)
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "RateLimit"."count" + 1
    RETURNING "count"`

  // Limpeza ocasional das janelas antigas, sem atrasar a resposta.
  if (Math.random() < 0.01)
    db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 86_400_000) } } }).catch(() => {})

  return { ok: count <= max, retryAfter: Math.ceil((inicio + janela - Date.now()) / 1000) }
}

/** Para Server Actions: lança um erro com mensagem amigável quando o limite estoura. */
export async function limitar(tipo: Limite, id: string) {
  const r = await rateLimit(tipo, id)
  if (r.ok) return
  const espera = r.retryAfter < 90 ? `${r.retryAfter} segundos` : `${Math.ceil(r.retryAfter / 60)} minutos`
  throw new ActionError(`Muitas tentativas seguidas. Tente de novo em ${espera}.`)
}

/** IP de quem fez a requisição (atrás de proxy, como na Vercel, vem no x-forwarded-for). */
export async function clientIp() {
  const h = await headers()
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "desconhecido"
}
