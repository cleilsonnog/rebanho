import { afterAll, describe, expect, it, vi } from "vitest"

import { GET } from "@/app/api/cron/backup/route"
import { db } from "@/lib/db"
import { LIMITES, rateLimit } from "@/lib/rate-limit"

// A rota de backup é a única aberta para fora; o limite de pedidos protege a página pública e as ações.

vi.mock("@/lib/backup", () => ({ backupSemanal: vi.fn(async () => ({ criado: "backup-teste", removidos: [] })) }))

const pedido = (auth?: string) => new Request("http://localhost/api/cron/backup", { headers: auth ? { authorization: auth } : {} })

describe("rota do backup (/api/cron/backup)", () => {
  it("sem CRON_SECRET configurado, recusa tudo", async () => {
    vi.stubEnv("CRON_SECRET", "")
    expect((await GET(pedido("Bearer "))).status).toBe(401)
    vi.unstubAllEnvs()
  })

  it("recusa sem senha ou com senha errada", async () => {
    vi.stubEnv("CRON_SECRET", "segredo-de-teste")
    expect((await GET(pedido())).status).toBe(401)
    expect((await GET(pedido("Bearer errada"))).status).toBe(401)
    expect((await GET(pedido("segredo-de-teste"))).status).toBe(401)
    vi.unstubAllEnvs()
  })

  it("com a senha certa, faz o backup", async () => {
    vi.stubEnv("CRON_SECRET", "segredo-de-teste")
    const r = await GET(pedido("Bearer segredo-de-teste"))
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ criado: "backup-teste", removidos: [], historicoApagado: expect.any(Number) })
    vi.unstubAllEnvs()
  })
})

describe("limite de pedidos", () => {
  const id = `teste-${Date.now()}`
  afterAll(() => db.rateLimit.deleteMany({ where: { key: { contains: id } } }))

  it(`a página pública da carteirinha bloqueia depois de ${LIMITES.verificar.max} consultas por minuto`, async () => {
    // A contagem é por janela de 1 minuto: perto da virada, espera a próxima para não zerar no meio.
    const resto = 60_000 - (Date.now() % 60_000)
    if (resto < 20_000) await new Promise((r) => setTimeout(r, resto + 500))
    const resultados = []
    for (let i = 0; i <= LIMITES.verificar.max; i++) resultados.push((await rateLimit("verificar", id)).ok)
    expect(resultados.slice(0, LIMITES.verificar.max).every(Boolean)).toBe(true)
    expect(resultados.at(-1)).toBe(false)
  })
})
