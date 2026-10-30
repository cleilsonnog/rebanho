import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { listarHistorico } from "@/lib/actions/audit"
import { clearData } from "@/lib/actions/church"
import { createMember, deleteMember } from "@/lib/actions/members"
import { limparHistorico } from "@/lib/audit"
import { db } from "@/lib/db"
import type { Church, ChurchUser } from "@/lib/generated/prisma/client"

import { apagarIgrejasDeTeste, criarIgreja, criarUsuario, logar, membro } from "./helpers"

// Histórico de alterações (lib/audit.ts): grava quem fez o quê só quando a ação dá certo,
// cada igreja vê só o seu, só o admin consulta e "Apagar dados" não apaga o histórico.

let igreja: Church
let outra: Church
let admin: ChurchUser
let secretaria: ChurchUser

const ultimos = (churchId: string) => db.auditLog.findMany({ where: { churchId }, orderBy: { createdAt: "desc" } })

beforeAll(async () => {
  await apagarIgrejasDeTeste()
  igreja = await criarIgreja("Historico")
  outra = await db.church.create({ data: { nome: "TESTE Historico outra" } })
  admin = await criarUsuario(igreja.id, "admin")
  secretaria = await criarUsuario(igreja.id, "secretaria")
})

afterAll(apagarIgrejasDeTeste)

describe("gravação", () => {
  it("registra quem cadastrou e excluiu, com o nome do membro", async () => {
    await logar(secretaria)
    const r = await createMember(membro({ nome: "Maria Historico" }))
    if (!r.ok) throw new Error(r.error)
    await deleteMember(r.data.id)

    const [excluiu, cadastrou] = await ultimos(igreja.id)
    expect(cadastrou).toMatchObject({ userId: secretaria.id, userNome: secretaria.nome, papel: "secretaria", area: "membros", descricao: "Cadastrou o membro Maria Historico" })
    expect(excluiu.descricao).toBe("Excluiu o membro Maria Historico")
  })

  it("não registra ação negada nem com dados inválidos", async () => {
    const antes = await db.auditLog.count({ where: { churchId: igreja.id } })
    await logar(await criarUsuario(igreja.id, "tesouraria"))
    expect((await createMember(membro())).ok).toBe(false)
    await logar(secretaria)
    expect((await createMember(membro({ nome: "" }))).ok).toBe(false)
    expect(await db.auditLog.count({ where: { churchId: igreja.id } })).toBe(antes)
  })
})

describe("consulta", () => {
  it("só o admin vê o histórico", async () => {
    await logar(secretaria)
    expect(await listarHistorico()).toEqual({ ok: false, error: "Sua função não permite fazer isso." })
  })

  it("cada igreja vê só o seu", async () => {
    await logar(await criarUsuario(outra.id, "admin"))
    const r = await listarHistorico()
    expect(r.ok && r.data.itens).toEqual([])

    await logar(admin)
    const minha = await listarHistorico()
    expect(minha.ok && minha.data.itens.length).toBeGreaterThan(0)
  })

  it("filtra por área", async () => {
    await logar(admin)
    const r = await listarHistorico({ area: "financeiro" })
    expect(r.ok && r.data.itens).toEqual([])
  })
})

describe("guarda", () => {
  it("apagar os dados da igreja não apaga o histórico, e fica registrado", async () => {
    await logar(admin)
    const antes = await db.auditLog.count({ where: { churchId: igreja.id } })
    expect((await clearData("APAGAR")).ok).toBe(true)
    const depois = await ultimos(igreja.id)
    expect(depois).toHaveLength(antes + 1)
    expect(depois[0]).toMatchObject({ area: null, descricao: "Apagou todos os dados da igreja" })
  })

  it("a limpeza semanal só apaga o que tem mais de 12 meses", async () => {
    const velho = await db.auditLog.create({
      data: { churchId: igreja.id, userNome: "x", papel: "admin", descricao: "antigo", createdAt: new Date("2025-01-01") },
    })
    const recentes = await db.auditLog.count({ where: { churchId: igreja.id, id: { not: velho.id } } })
    await limparHistorico(new Date("2026-10-30"))
    expect(await db.auditLog.findUnique({ where: { id: velho.id } })).toBeNull()
    expect(await db.auditLog.count({ where: { churchId: igreja.id } })).toBe(recentes)
  })
})
