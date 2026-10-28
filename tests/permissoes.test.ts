import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createCell, saveCellMeeting, saveCellStudy, updateCell } from "@/lib/actions/cells"
import { clearData, updateChurch } from "@/lib/actions/church"
import { createTransaction } from "@/lib/actions/finance"
import { createMember } from "@/lib/actions/members"
import { createVisit } from "@/lib/actions/visits"
import { db } from "@/lib/db"
import type { Church } from "@/lib/generated/prisma/client"

import { apagarIgrejasDeTeste, criarIgreja, criarUsuario, logar, membro, visita } from "./helpers"

// Cada função só grava o que pode (lib/permissions.ts), e o servidor confere de novo os dados (Zod).

const NEGADO = { ok: false, error: "Sua função não permite fazer isso." }

let igreja: Church
let minhaCelula: string
let outraCelula: string
let liderId: string
let alguem: string
let foraDaCelula: string

const celulaInput = (lideres: string[]) => ({
  nome: `Célula ${Date.now()}`,
  congregacao: "",
  horario: "",
  endereco: membro().endereco,
  lat: 0,
  lng: 0,
  lideres,
  colideres: [],
  anfitrioes: [],
  membroIds: [],
})
const reuniao = (celulaId: string, presentes: string[] = []) => ({ celulaId, data: "2026-10-01", presentes, visitantes: [], observacoes: "" })

beforeAll(async () => {
  await apagarIgrejasDeTeste()
  igreja = await criarIgreja("Permissoes")
  const [c1, c2] = await db.cell.findMany({ where: { churchId: igreja.id }, include: { leaders: true, members: true }, take: 2 })
  minhaCelula = c1.id
  outraCelula = c2.id
  liderId = c1.leaders.find((l) => l.funcao === "lider")!.memberId
  alguem = c1.members[0].id
  foraDaCelula = c2.members[0].id
})

afterAll(apagarIgrejasDeTeste)

describe("tesouraria", () => {
  beforeAll(async () => logar(await criarUsuario(igreja.id, "tesouraria")))

  it("não cadastra membro, visita nem célula", async () => {
    expect(await createMember(membro())).toEqual(NEGADO)
    expect(await createVisit(visita(alguem))).toEqual(NEGADO)
    expect(await createCell(celulaInput([alguem]))).toEqual(NEGADO)
  })

  it("lança no financeiro", async () => {
    const r = await createTransaction({ tipo: "entrada", categoria: "Oferta", valor: 50, data: "2026-10-01", descricao: "Teste", formaPagamento: "pix" })
    expect(r.ok).toBe(true)
  })
})

describe("líder de célula", () => {
  beforeAll(async () => logar(await criarUsuario(igreja.id, "lider", { memberId: liderId })))

  it("não cria nem edita células (isso é da secretaria)", async () => {
    expect(await createCell(celulaInput([alguem]))).toEqual(NEGADO)
    expect(await updateCell(minhaCelula, celulaInput([alguem]))).toEqual(NEGADO)
  })

  it("lança a reunião da célula dele", async () => {
    expect((await saveCellMeeting(reuniao(minhaCelula, [alguem]))).ok).toBe(true)
  })

  it("não lança reunião de outra célula", async () => {
    expect(await saveCellMeeting(reuniao(outraCelula))).toMatchObject({ ok: false })
  })

  it("não marca presença de quem não é da célula", async () => {
    expect(await saveCellMeeting(reuniao(minhaCelula, [foraDaCelula]))).toMatchObject({
      ok: false,
      error: "Há presença marcada para quem não é da célula.",
    })
  })

  it("não publica o estudo da semana nem lança financeiro", async () => {
    expect(await saveCellStudy({ semana: "2026-10-26", tema: "T", referencia: "", texto: "x" })).toEqual(NEGADO)
    const r = await createTransaction({ tipo: "entrada", categoria: "Oferta", valor: 50, data: "2026-10-01", descricao: "x", formaPagamento: "pix" })
    expect(r).toEqual(NEGADO)
  })
})

describe("pastor", () => {
  beforeAll(async () => logar(await criarUsuario(igreja.id, "pastor")))

  it("lança reunião de qualquer célula e publica o estudo", async () => {
    expect((await saveCellMeeting(reuniao(outraCelula))).ok).toBe(true)
    expect((await saveCellStudy({ semana: "2026-11-02", tema: "Teste", referencia: "", texto: "Estudo" })).ok).toBe(true)
  })

  it("não monta células (só a secretaria)", async () => {
    expect(await createCell(celulaInput([alguem]))).toEqual(NEGADO)
  })
})

describe("secretaria", () => {
  beforeAll(async () => logar(await criarUsuario(igreja.id, "secretaria")))

  it("não altera os dados da igreja nem apaga tudo (só o admin)", async () => {
    const r = await updateChurch({ nome: "Outro Nome", sigla: "", cnpj: "", pastor: "", telefone: "", email: "", endereco: membro().endereco })
    expect(r).toEqual(NEGADO)
    expect(await clearData("APAGAR")).toEqual(NEGADO)
    expect(await db.member.count({ where: { churchId: igreja.id } })).toBeGreaterThan(0)
  })
})

describe("admin", () => {
  beforeAll(async () => logar(await criarUsuario(igreja.id, "admin")))

  it("apagar dados exige digitar APAGAR", async () => {
    expect(await clearData("apagar")).toMatchObject({ ok: false, error: "Digite APAGAR para confirmar" })
    expect(await db.member.count({ where: { churchId: igreja.id } })).toBeGreaterThan(0)
  })
})

describe("validação no servidor", () => {
  beforeAll(async () => logar(await criarUsuario(igreja.id, "secretaria")))

  it("recusa dados inválidos mesmo que a tela seja burlada", async () => {
    const r = await createMember(membro({ nascimento: "2999-01-01", email: "não-é-email" }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.fieldErrors ?? {})).toEqual(expect.arrayContaining(["nascimento", "email"]))
  })

  it("recusa textos gigantes", async () => {
    expect((await createMember(membro({ nome: "x".repeat(10_000) }))).ok).toBe(false)
  })
})
