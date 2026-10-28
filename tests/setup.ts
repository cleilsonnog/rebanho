import { config } from "dotenv"
import { vi } from "vitest"

// Os testes rodam no banco da branch "testes" da Neon, nunca no de produção.
config({ quiet: true })
const teste = process.env.TEST_DATABASE_URL
const host = (url?: string) => url?.match(/@([^/:?]+)/)?.[1]
if (!teste) throw new Error("Configure TEST_DATABASE_URL no .env (banco de testes). Veja tests/README.md.")
if (host(teste) === host(process.env.DATABASE_URL) || host(teste) === host(process.env.DIRECT_URL))
  throw new Error("TEST_DATABASE_URL aponta para o banco de produção. Os testes não vão rodar.")
process.env.DATABASE_URL = teste

// Login: os testes escolhem quem está logado (tests/helpers.ts › logar). O resto do código roda de verdade.
vi.mock("@/lib/church", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/church")>()),
  getSession: vi.fn(),
}))

// O limite de pedidos tem teste próprio; nos outros, dezenas de ações seguidas não podem esbarrar nele.
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  limitar: vi.fn(),
}))
