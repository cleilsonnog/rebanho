import { vi } from "vitest"

import { getSession } from "@/lib/church"
import { db } from "@/lib/db"
import { insertDemoData } from "@/lib/demo"
import type { ChurchUser, UserRole } from "@/lib/generated/prisma/client"

// Cada execução (seu computador ou um job do GitHub) usa um prefixo próprio, para várias rodarem juntas no
// mesmo banco de testes sem uma apagar as igrejas da outra.
export const PREFIXO = `TESTE ${process.env.GITHUB_RUN_ID ?? "local"} `

/** Igreja com os dados de exemplo (148 membros, células, filiais Leste e Sul, visitas, financeiro). */
export async function criarIgreja(nome: string) {
  const church = await db.church.create({ data: { nome: `${PREFIXO}${nome}`, cidade: "Goiânia", uf: "GO" } })
  await db.$transaction((tx) => insertDemoData(tx, church.id), { timeout: 120_000 })
  return church
}

/** Apaga as igrejas desta execução e as que sobraram de execuções interrompidas (mais de 2 horas). */
export async function apagarIgrejasDeTeste() {
  const where = {
    OR: [{ nome: { startsWith: PREFIXO } }, { nome: { startsWith: "TESTE " }, createdAt: { lt: new Date(Date.now() - 2 * 3600_000) } }],
  }
  await db.churchUser.updateMany({ where: { church: where }, data: { congregationId: null } })
  await db.church.deleteMany({ where })
}

let n = 0
export function criarUsuario(churchId: string, papel: UserRole, extra: Partial<ChurchUser> = {}) {
  n++
  return db.churchUser.create({ data: { churchId, nome: `${papel} ${n}`, email: `${papel}${n}-${Date.now()}@teste.dev`, papel, ...extra } })
}

/** Faz as Server Actions rodarem como esse usuário dessa igreja. */
export async function logar(user: ChurchUser) {
  const church = await db.church.findUniqueOrThrow({ where: { id: user.churchId } })
  vi.mocked(getSession).mockResolvedValue({ church, user })
  return { church, user }
}

export const filialPorNome = (churchId: string, nome: string) =>
  db.congregation.findFirstOrThrow({ where: { churchId, nome } })

export const sede = (churchId: string) => db.congregation.findFirstOrThrow({ where: { churchId }, orderBy: { id: "asc" } })

/** Membro válido para o formulário; sem bairro, para não consultar o mapa na internet. */
export const membro = (extra: Record<string, unknown> = {}) => ({
  nome: "Fulano de Teste",
  sexo: "M" as const,
  nascimento: "1990-05-10",
  telefone: "",
  email: "",
  estadoCivil: "solteiro" as const,
  endereco: { rua: "", numero: "", bairro: "", cidade: "", uf: "", cep: "" },
  lat: 0,
  lng: 0,
  congregacao: "",
  cargo: "Membro",
  ministerios: [],
  status: "ativo" as const,
  batizado: false,
  membroDesde: "2020-01-01",
  ...extra,
})

export const visita = (membroId: string) => ({
  membroId,
  data: "2026-10-01",
  responsavel: "Pr. Teste",
  motivo: "Acompanhamento",
  notas: "Visita de teste",
})
