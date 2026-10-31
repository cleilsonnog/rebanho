import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { copyFamilyAddress, deleteFamily, saveFamily } from "@/lib/actions/families"
import { deleteMember } from "@/lib/actions/members"
import { loadAppData } from "@/lib/data"
import { db } from "@/lib/db"
import type { Church, ChurchUser, Member } from "@/lib/generated/prisma/client"

import { apagarIgrejasDeTeste, criarIgreja, criarUsuario, filialPorNome, logar, sede } from "./helpers"

// Famílias: quem cuida dos membros liga casal e filhos; quem é de uma filial só mexe nas pessoas da filial dele,
// e cada igreja só vê as suas.

const NEGADO = { ok: false, error: "Sua função não permite fazer isso." }
const FORA = { ok: false, error: "Pessoa não encontrada nesta igreja." }

let igreja: Church
let outra: Church
let secretaria: ChurchUser
/** Pessoas da sede e da Congregação Leste, sem família (a demonstração já liga algumas). */
let daSede: Member[]
let daLeste: Member[]

const familia = (nome: string, pessoas: [Member, "responsavel" | "conjuge" | "filho" | "outro"][]) => ({
  nome,
  membros: pessoas.map(([m, parentesco]) => ({ id: m.id, parentesco })),
})
const familiaDe = async (id: string) => (await db.member.findUniqueOrThrow({ where: { id } })).familyId

beforeAll(async () => {
  await apagarIgrejasDeTeste()
  igreja = await criarIgreja("Familias")
  outra = await criarIgreja("Familias outra")
  secretaria = await criarUsuario(igreja.id, "secretaria")
  const semFamilia = (congregationId: string) =>
    db.member.findMany({ where: { churchId: igreja.id, congregationId, familyId: null }, orderBy: { nome: "asc" }, take: 6 })
  daSede = await semFamilia((await sede(igreja.id)).id)
  daLeste = await semFamilia((await filialPorNome(igreja.id, "Congregação Leste")).id)
})

afterAll(apagarIgrejasDeTeste)

describe("secretaria da sede", () => {
  beforeAll(() => logar(secretaria))

  it("cria a família, tira alguém e a pessoa continua cadastrada", async () => {
    const [pai, mae, filho] = daSede
    const r = await saveFamily(undefined, familia("Família Teste", [[pai, "responsavel"], [mae, "conjuge"], [filho, "filho"]]))
    if (!r.ok) throw new Error(r.error)
    const id = r.data.familia.id
    expect(await db.member.count({ where: { familyId: id } })).toBe(3)

    const sem = await saveFamily(id, familia("Família Teste", [[pai, "responsavel"], [mae, "conjuge"]]))
    expect(sem.ok && sem.data.removidos).toEqual([filho.id])
    expect(await db.member.findUniqueOrThrow({ where: { id: filho.id } })).toMatchObject({ familyId: null, parentesco: null })
    expect(await db.auditLog.count({ where: { churchId: igreja.id, descricao: { contains: "Família Teste" } } })).toBe(2)
  })

  it("quem entra numa família sai da outra, que some se ficar vazia", async () => {
    const [, , , sozinho, outroAdulto] = daSede
    const a = await saveFamily(undefined, familia("Família A", [[sozinho, "responsavel"]]))
    if (!a.ok) throw new Error(a.error)
    const b = await saveFamily(undefined, familia("Família B", [[outroAdulto, "responsavel"], [sozinho, "outro"]]))
    expect(b.ok && b.data.apagadas).toEqual([a.data.familia.id])
    expect(await db.family.findUnique({ where: { id: a.data.familia.id } })).toBeNull()
  })

  it("copia o endereço para a família", async () => {
    const [pai, mae] = daSede
    const id = (await familiaDe(pai.id))!
    await db.member.update({ where: { id: pai.id }, data: { rua: "Rua da Família", numero: "10", bairro: "Centro", cidade: "Goiânia", uf: "GO", cep: "74000-000" } })
    const r = await copyFamilyAddress({ familiaId: id, membroId: pai.id })
    expect(r.ok && r.data.ids).toEqual([mae.id])
    expect(await db.member.findUniqueOrThrow({ where: { id: mae.id } })).toMatchObject({ rua: "Rua da Família", numero: "10", bairro: "Centro" })
    // Quem não é da família não serve de origem.
    expect((await copyFamilyAddress({ familiaId: id, membroId: daSede[5].id })).ok).toBe(false)
  })

  it("excluir a última pessoa da família apaga a família", async () => {
    const [, , , , , ultimo] = daSede
    const r = await saveFamily(undefined, familia("Família Única", [[ultimo, "responsavel"]]))
    if (!r.ok) throw new Error(r.error)
    expect((await deleteMember(ultimo.id)).ok).toBe(true)
    expect(await db.family.findUnique({ where: { id: r.data.familia.id } })).toBeNull()
  })

  it("desfazer tira todos e apaga a família", async () => {
    const id = (await familiaDe(daSede[0].id))!
    expect((await deleteFamily(id)).ok).toBe(true)
    expect(await db.family.findUnique({ where: { id } })).toBeNull()
    expect(await familiaDe(daSede[1].id)).toBeNull()
  })

  it("valida a lista de pessoas", async () => {
    const [a] = daSede
    expect((await saveFamily(undefined, { nome: "Vazia", membros: [] })).ok).toBe(false)
    expect((await saveFamily(undefined, familia("Repetida", [[a, "responsavel"], [a, "filho"]]))).ok).toBe(false)
  })
})

describe("secretaria de filial", () => {
  let daFilial: ChurchUser
  let mista: string

  beforeAll(async () => {
    // Família com gente da sede e da Leste, montada pela secretaria da sede.
    await logar(secretaria)
    const r = await saveFamily(undefined, familia("Família Mista", [[daSede[2], "responsavel"], [daLeste[0], "conjuge"]]))
    if (!r.ok) throw new Error(r.error)
    mista = r.data.familia.id
    const leste = await filialPorNome(igreja.id, "Congregação Leste")
    daFilial = await criarUsuario(igreja.id, "secretaria", { congregationId: leste.id })
    await logar(daFilial)
  })

  it("não inclui gente de outra filial", async () => {
    expect(await saveFamily(undefined, familia("Família X", [[daLeste[1], "responsavel"], [daSede[3], "filho"]]))).toEqual(FORA)
  })

  it("editar a família não tira quem é de outra filial", async () => {
    const r = await saveFamily(mista, familia("Família Mista", [[daLeste[0], "responsavel"], [daLeste[1], "filho"]]))
    expect(r.ok && r.data.removidos).toEqual([])
    expect(await familiaDe(daSede[2].id)).toBe(mista)
  })

  it("desfazer só tira as pessoas da filial; a família continua com as outras", async () => {
    expect((await deleteFamily(mista)).ok).toBe(true)
    expect(await familiaDe(daLeste[0].id)).toBeNull()
    expect(await familiaDe(daSede[2].id)).toBe(mista)
  })

  it("só recebe as famílias de quem ela vê", async () => {
    const d = await loadAppData({ church: igreja, user: daFilial })
    expect(d.families.some((f) => f.id === mista)).toBe(false)
    const ids = new Set(d.members.map((m) => m.id))
    expect(d.members.every((m) => !m.familiaId || d.families.some((f) => f.id === m.familiaId))).toBe(true)
    expect(ids.has(daSede[2].id)).toBe(false)
  })
})

describe("outras funções e outras igrejas", () => {
  it("os dados de exemplo trazem famílias morando juntas", async () => {
    const fs = await db.family.findMany({ where: { churchId: outra.id }, include: { members: true } })
    expect(fs.length).toBeGreaterThanOrEqual(4)
    for (const f of fs) {
      expect(f.members.filter((m) => m.parentesco === "responsavel")).toHaveLength(1)
      expect(new Set(f.members.map((m) => `${m.rua} ${m.numero}`)).size).toBe(1)
    }
  })

  it("tesouraria e líder não montam famílias", async () => {
    for (const papel of ["tesouraria", "lider"] as const) {
      await logar(await criarUsuario(igreja.id, papel))
      expect(await saveFamily(undefined, familia("X", [[daSede[4], "responsavel"]]))).toEqual(NEGADO)
    }
  })

  it("o líder de célula recebe só as famílias das pessoas da célula dele", async () => {
    const celula = await db.cell.findFirstOrThrow({ where: { churchId: igreja.id }, include: { leaders: true, members: true } })
    const lider = await criarUsuario(igreja.id, "lider", { memberId: celula.leaders.find((l) => l.funcao === "lider")!.memberId })
    const d = await loadAppData({ church: igreja, user: lider })
    const daCelula = new Set(celula.members.map((m) => m.familyId).filter(Boolean))
    expect(d.families.every((f) => daCelula.has(f.id))).toBe(true)
  })

  it("outra igreja não inclui membros nem mexe nas famílias desta", async () => {
    await logar(await criarUsuario(outra.id, "secretaria"))
    const desta = await db.family.findFirstOrThrow({ where: { churchId: igreja.id } })
    const pessoa = await db.member.findFirstOrThrow({ where: { churchId: outra.id } })
    const intrusa = await db.member.findFirstOrThrow({ where: { churchId: igreja.id, familyId: desta.id } })

    expect(await saveFamily(undefined, familia("Roubo", [[intrusa, "responsavel"]]))).toEqual(FORA)
    expect((await saveFamily(desta.id, { nome: "Roubo", membros: [{ id: pessoa.id, parentesco: "outro" }] })).ok).toBe(false)
    expect((await deleteFamily(desta.id)).ok).toBe(false)
    expect((await copyFamilyAddress({ familiaId: desta.id, membroId: intrusa.id })).ok).toBe(false)
    expect(await db.family.findUniqueOrThrow({ where: { id: desta.id } })).toMatchObject({ nome: desta.nome })
    expect(await familiaDe(intrusa.id)).toBe(desta.id)
  })
})
