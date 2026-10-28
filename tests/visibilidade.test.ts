import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { loadAppData } from "@/lib/data"
import { db } from "@/lib/db"
import type { Church, UserRole } from "@/lib/generated/prisma/client"
import type { AppData } from "@/lib/types"

import { apagarIgrejasDeTeste, criarIgreja, criarUsuario } from "./helpers"

// O que cada função recebe do servidor. O que não pode ver nem chega ao navegador (lib/data.ts › loadAppData).

let igreja: Church
let total: number
let celula: { id: string; pessoas: string[] }
const dados = {} as Record<UserRole, AppData>

const comEndereco = (d: AppData) => d.members.filter((m) => m.endereco.rua || m.endereco.bairro).length
const comContato = (d: AppData) => d.members.filter((m) => m.telefone || m.email).length
const noMapa = (d: AppData) => d.members.filter((m) => m.lat !== 0 || m.lng !== 0).length

beforeAll(async () => {
  await apagarIgrejasDeTeste()
  igreja = await criarIgreja("Visibilidade")
  total = await db.member.count({ where: { churchId: igreja.id } })
  const c = await db.cell.findFirstOrThrow({ where: { churchId: igreja.id }, include: { leaders: true, members: true } })
  celula = { id: c.id, pessoas: c.members.map((m) => m.id) }
  const lider = c.leaders.find((l) => l.funcao === "lider")!.memberId

  for (const papel of ["admin", "secretaria", "pastor", "tesouraria"] as const)
    dados[papel] = await loadAppData({ church: igreja, user: await criarUsuario(igreja.id, papel) })
  dados.lider = await loadAppData({ church: igreja, user: await criarUsuario(igreja.id, "lider", { memberId: lider }) })
})

afterAll(apagarIgrejasDeTeste)

describe("admin, secretaria e pastor (cuidado pastoral)", () => {
  it.each(["admin", "secretaria", "pastor"] as const)("%s recebe todos os membros com endereço, contato e mapa", (papel) => {
    const d = dados[papel]
    expect(d.members).toHaveLength(total)
    expect(comEndereco(d)).toBe(total)
    expect(noMapa(d)).toBe(total)
    expect(d.visits.length).toBeGreaterThan(0)
    expect(d.certificates.length).toBeGreaterThan(0)
    expect(d.cells.length).toBeGreaterThan(0)
  })

  it("só o admin recebe a lista de usuários", () => {
    expect(dados.admin.users.length).toBeGreaterThan(0)
    expect(dados.secretaria.users).toHaveLength(0)
    expect(dados.pastor.users).toHaveLength(0)
  })

  it("financeiro só para admin e tesouraria", () => {
    expect(dados.admin.transactions.length).toBeGreaterThan(0)
    expect(dados.tesouraria.transactions.length).toBeGreaterThan(0)
    expect(dados.secretaria.transactions).toHaveLength(0)
    expect(dados.pastor.transactions).toHaveLength(0)
    expect(dados.lider.transactions).toHaveLength(0)
  })
})

describe("tesouraria", () => {
  it("recebe os nomes, mas nenhum endereço, contato ou posição no mapa", () => {
    const d = dados.tesouraria
    expect(d.members).toHaveLength(total)
    expect(comEndereco(d)).toBe(0)
    expect(comContato(d)).toBe(0)
    expect(noMapa(d)).toBe(0)
    expect(d.members.every((m) => !m.observacoes)).toBe(true)
  })

  it("não recebe visitas pastorais, certificados nem células", () => {
    expect(dados.tesouraria.visits).toHaveLength(0)
    expect(dados.tesouraria.certificates).toHaveLength(0)
    expect(dados.tesouraria.cells).toHaveLength(0)
    expect(dados.tesouraria.cellMeetings).toHaveLength(0)
  })
})

describe("líder de célula", () => {
  it("recebe só as pessoas da célula dele", () => {
    const d = dados.lider
    expect(d.members.map((m) => m.id).sort()).toEqual([...celula.pessoas].sort())
  })

  it("recebe contato da célula, mas nenhuma posição no mapa", () => {
    expect(comContato(dados.lider)).toBeGreaterThan(0)
    expect(noMapa(dados.lider)).toBe(0)
  })

  it("só a célula que lidera e as reuniões dela", () => {
    expect(dados.lider.cells.map((c) => c.id)).toEqual([celula.id])
    expect(dados.lider.cellMeetings.length).toBeGreaterThan(0)
    expect(dados.lider.cellMeetings.every((r) => r.celulaId === celula.id)).toBe(true)
  })

  it("não recebe visitas pastorais nem certificados", () => {
    expect(dados.lider.visits).toHaveLength(0)
    expect(dados.lider.certificates).toHaveLength(0)
  })

  it("sem cadastro de membro ligado, não vê célula nenhuma", async () => {
    const d = await loadAppData({ church: igreja, user: await criarUsuario(igreja.id, "lider") })
    expect(d.members).toHaveLength(0)
    expect(d.cells).toHaveLength(0)
  })
})
