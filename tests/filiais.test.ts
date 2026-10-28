import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createCell, deleteCell, saveCellStudy } from "@/lib/actions/cells"
import { removeFilial } from "@/lib/actions/church"
import { createMember, deleteMember, updateMember } from "@/lib/actions/members"
import { updateUser } from "@/lib/actions/users"
import { createVisit } from "@/lib/actions/visits"
import { loadAppData } from "@/lib/data"
import { db } from "@/lib/db"
import type { Church, ChurchUser, Congregation } from "@/lib/generated/prisma/client"

import { apagarIgrejasDeTeste, criarIgreja, criarUsuario, filialPorNome, logar, membro, sede, visita } from "./helpers"

// Secretaria ou pastor de uma filial só vê e altera os dados dela.

let igreja: Church
let leste: Congregation
let secretariaLeste: ChurchUser
let membroDaSede: string
let celulaDaSede: string

const celulaInput = (congregacao: string, lideres: string[]) => ({
  nome: `Célula ${Date.now()}`,
  congregacao,
  horario: "",
  endereco: membro().endereco,
  lat: 0,
  lng: 0,
  lideres,
  colideres: [],
  anfitrioes: [],
  membroIds: [],
})

beforeAll(async () => {
  await apagarIgrejasDeTeste()
  igreja = await criarIgreja("Filiais")
  leste = await filialPorNome(igreja.id, "Congregação Leste")
  membroDaSede = (await db.member.findFirstOrThrow({ where: { churchId: igreja.id, congregationId: (await sede(igreja.id)).id } })).id
  celulaDaSede = (await db.cell.findFirstOrThrow({ where: { churchId: igreja.id } })).id
  secretariaLeste = await criarUsuario(igreja.id, "secretaria", { congregationId: leste.id })
  await logar(secretariaLeste)
})

afterAll(apagarIgrejasDeTeste)

describe("secretaria restrita à Congregação Leste", () => {
  it("recebe só membros, visitas e células da Leste", async () => {
    const d = await loadAppData({ church: igreja, user: secretariaLeste })
    const daLeste = await db.member.count({ where: { churchId: igreja.id, congregationId: leste.id } })
    expect(d.members).toHaveLength(daLeste)
    expect(d.members.every((m) => m.congregacao === "Congregação Leste")).toBe(true)
    const ids = new Set(d.members.map((m) => m.id))
    expect(d.visits.every((v) => ids.has(v.membroId))).toBe(true)
    expect(d.cells.every((c) => c.congregacao === "Congregação Leste")).toBe(true)
    expect(d.me.congregacao).toBe("Congregação Leste")
  })

  it("cadastra membro só na filial dela", async () => {
    expect(await createMember(membro({ congregacao: "Sede" }))).toMatchObject({
      ok: false,
      error: "Você só pode cadastrar membros na sua filial.",
    })
    const r = await createMember(membro({ nome: "Novo da Leste" }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.congregacao).toBe("Congregação Leste")
  })

  it("não altera, apaga nem visita membro da sede", async () => {
    expect((await updateMember(membroDaSede, membro({ nome: "Mudado" }))).ok).toBe(false)
    expect((await deleteMember(membroDaSede)).ok).toBe(false)
    expect((await createVisit(visita(membroDaSede))).ok).toBe(false)
    expect(await db.member.findUnique({ where: { id: membroDaSede } })).not.toBeNull()
  })

  it("cria célula só na filial dela, com gente da filial", async () => {
    const daLeste = (await db.member.findFirstOrThrow({ where: { churchId: igreja.id, congregationId: leste.id } })).id
    expect((await createCell(celulaInput("Sede", [daLeste]))).ok).toBe(false)
    expect((await createCell(celulaInput("Congregação Leste", [membroDaSede]))).ok).toBe(false)
    const r = await createCell(celulaInput("", [daLeste]))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.congregacao).toBe("Congregação Leste")
  })

  it("não apaga célula da sede nem publica o estudo da igreja toda", async () => {
    expect((await deleteCell(celulaDaSede)).ok).toBe(false)
    expect((await saveCellStudy({ semana: "2026-10-26", tema: "T", referencia: "", texto: "x" })).ok).toBe(false)
  })
})

describe("admin e as filiais", () => {
  beforeAll(async () => logar(await criarUsuario(igreja.id, "admin")))

  it("não exclui filial com usuário restrito a ela (não pode ampliar o acesso sem querer)", async () => {
    expect(await removeFilial(leste.id)).toMatchObject({
      ok: false,
      error: "Há usuários com acesso só a esta filial. Mude o acesso deles em Usuários antes de excluir.",
    })
  })

  it("mudar a secretaria de filial para tesouraria tira a restrição", async () => {
    const r = await updateUser(secretariaLeste.id, { papel: "tesouraria" })
    expect(r.ok).toBe(true)
    expect((await db.churchUser.findUniqueOrThrow({ where: { id: secretariaLeste.id } })).congregationId).toBeNull()
  })

  it("sem usuário restrito, exclui a filial e passa os membros para a sede", async () => {
    const daLeste = await db.member.count({ where: { churchId: igreja.id, congregationId: leste.id } })
    expect((await removeFilial(leste.id)).ok).toBe(true)
    expect(await db.member.count({ where: { churchId: igreja.id, congregationId: (await sede(igreja.id)).id } })).toBeGreaterThanOrEqual(daLeste)
    expect(await db.member.count({ where: { churchId: igreja.id, congregationId: null } })).toBe(0)
  })
})
