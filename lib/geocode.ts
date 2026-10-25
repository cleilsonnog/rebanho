import "server-only"

import { db } from "./db"
import type { Endereco } from "./types"

// Posição no mapa a partir do endereço, com serviços grátis: Nominatim (OpenStreetMap) e BrasilAPI.
// O Nominatim pede no máximo 1 consulta por segundo e um User-Agent que identifique o app.
// Para muitas igrejas ao mesmo tempo, trocar por um provedor com cota (ex.: LocationIQ, MapTiler).

const USER_AGENT = "Rebanho/0.1 (+https://github.com/cleilsonnog/rebanho)"

export type Ponto = { lat: number; lng: number }

async function getJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(6000) })
    return r.ok ? ((await r.json()) as T) : null
  } catch {
    return null
  }
}

/** `null` = o serviço respondeu que não achou; `undefined` = falhou (rede, limite), vale tentar de novo depois. */
async function nominatim(params: Record<string, string>): Promise<Ponto | null | undefined> {
  // `countrycodes` vale para a busca livre (q) e para a estruturada; `country` não pode ir junto com q.
  const q = new URLSearchParams({ ...params, countrycodes: "br", format: "json", limit: "1" })
  const r = await getJSON<{ lat: string; lon: string }[]>(`https://nominatim.openstreetmap.org/search?${q}`)
  if (!r) return undefined
  return r[0] ? { lat: Number(r[0].lat), lng: Number(r[0].lon) } : null
}

async function porCep(cep: string): Promise<Ponto | null> {
  type Cep = { location?: { coordinates?: { latitude?: string; longitude?: string } } }
  const r = await getJSON<Cep>(`https://brasilapi.com.br/api/cep/v2/${cep.replace(/\D/g, "")}`)
  const c = r?.location?.coordinates
  return c?.latitude && c.longitude ? { lat: Number(c.latitude), lng: Number(c.longitude) } : null
}

/** Distância aproximada em km entre dois pontos (suficiente para comparar posições na mesma cidade). */
export function distanciaKm(a: Ponto, b: Ponto) {
  const kmLat = 111
  const kmLng = 111 * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot((a.lat - b.lat) * kmLat, (a.lng - b.lng) * kmLng)
}

/**
 * Posição exata de um endereço (casa da célula, prédio da igreja): pela rua, depois pelo CEP e por último
 * pelo bairro. Nunca recebe nome de pessoa, só o endereço.
 * A coordenada do CEP às vezes é só o centro da cidade: se ela cair a mais de 1,5 km do centro do bairro
 * informado, vale o bairro. A tela sempre deixa ajustar o pino à mão.
 */
export async function geocodeEndereco(e: Endereco): Promise<(Ponto & { precisao: "endereço" | "CEP" | "bairro" }) | null> {
  const cidade = { city: e.cidade, state: e.uf }
  if (e.rua) {
    const p = await nominatim({ street: `${e.numero} ${e.rua}`.trim(), ...cidade })
    if (p) return { ...p, precisao: "endereço" }
  }
  const cep = e.cep ? await porCep(e.cep) : null
  const bairro = e.bairro && e.cidade ? await nominatim({ q: `${e.bairro}, ${e.cidade} - ${e.uf}` }) : null
  if (cep && (!bairro || distanciaKm(cep, bairro) <= 1.5)) return { ...cep, precisao: "CEP" }
  if (bairro) return { ...bairro, precisao: "bairro" }
  return null
}

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()

export const chaveBairro = (e: Pick<Endereco, "bairro" | "cidade" | "uf">) =>
  [e.bairro, e.cidade, e.uf].map(normalizar).join("|")

/** Centro de cada bairro já guardado no banco (sem consultar a internet). `null` = já tentado, não achado. */
export async function bairrosGuardados(chaves: string[]) {
  const rows = await db.geoBairro.findMany({ where: { chave: { in: [...new Set(chaves)] } } })
  return new Map(rows.map((r) => [r.chave, r.lat !== null && r.lng !== null ? { lat: r.lat, lng: r.lng } : null]))
}

/**
 * Consulta o centro do bairro no OpenStreetMap e guarda a resposta, inclusive "não achado".
 * Se o serviço falhar, não guarda nada, para tentar de novo na próxima vez.
 */
export async function consultarBairro(e: Pick<Endereco, "bairro" | "cidade" | "uf">): Promise<Ponto | null> {
  const p = e.bairro && e.cidade ? await nominatim({ q: `${e.bairro}, ${e.cidade} - ${e.uf}` }) : null
  if (p === undefined) return null
  await db.geoBairro.upsert({
    where: { chave: chaveBairro(e) },
    create: { chave: chaveBairro(e), lat: p?.lat ?? null, lng: p?.lng ?? null },
    update: { lat: p?.lat ?? null, lng: p?.lng ?? null },
  })
  return p
}

/**
 * Posição de um membro no mapa: o centro do bairro com um desvio de até ~400 m, para que o pino nunca
 * aponte a casa da pessoa. Sem bairro ou bairro não encontrado, a pessoa fica fora do mapa (0/0).
 */
export function aproximar(centro: Ponto | null | undefined): Ponto {
  if (!centro) return { lat: 0, lng: 0 }
  return { lat: centro.lat + (Math.random() - 0.5) * 0.008, lng: centro.lng + (Math.random() - 0.5) * 0.008 }
}

export const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))
