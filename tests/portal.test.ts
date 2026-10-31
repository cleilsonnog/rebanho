import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { enablePortalForAll, setPortalAccess } from "@/lib/actions/portal"
import { db } from "@/lib/db"
import type { Church, Member } from "@/lib/generated/prisma/client"
import { carregarPortal, resolverAcesso } from "@/lib/portal"

import { apagarIgrejasDeTeste, criarIgreja, criarUsuario, filialPorNome, logar } from "./helpers"

// Portal do membro: quem a conta vê sai do e-mail com o portal liberado (lib/portal.ts › resolverAcesso).
// Cada pessoa vê a si mesma; casal com um e-mail só vê os dois; pais veem os filhos menores de 18 anos.

const NEGADO = { ok: false, error: "Sua função não permite fazer isso." }

// E-mails únicos por execução: a busca do portal olha todas as igrejas do banco de testes.
const marca = `${process.env.GITHUB_RUN_ID ?? "local"}-${Date.now()}`
const email = (nome: string) => `${nome}-${marca}@portal.teste`

let igreja: Church
let outra: Church
let familia: { id: string; pai: Member; mae: Member; filhos: Member[] }
let sozinho: Member

const ids = (a: Awaited<ReturnType<typeof resolverAcesso>>) => (a.tipo === "ok" ? a.visiveis.map((v) => v.id).sort() : a.tipo)
const liberar = (id: string, mail: string, extra: object = {}) => db.member.update({ where: { id }, data: { email: mail, portal: true, ...extra } })

beforeAll(async () => {
  await apagarIgrejasDeTeste()
  igreja = await criarIgreja("Portal")
  outra = await criarIgreja("Portal outra")
  // Uma família da demonstração com casal e pelo menos um filho.
  const f = await db.family.findFirstOrThrow({
    where: { churchId: igreja.id, members: { some: { parentesco: "conjuge" } }, AND: { members: { some: { parentesco: "filho" } } } },
    include: { members: { orderBy: { nascimento: "asc" } } },
  })
  familia = {
    id: f.id,
    pai: f.members.find((m) => m.parentesco === "responsavel")!,
    mae: f.members.find((m) => m.parentesco === "conjuge")!,
    filhos: f.members.filter((m) => m.parentesco === "filho"),
  }
  sozinho = await db.member.findFirstOrThrow({ where: { churchId: igreja.id, familyId: null, status: "ativo" } })
})

afterAll(apagarIgrejasDeTeste)

describe("quem a conta vê", () => {
  it("sem portal liberado não entra, mesmo com o e-mail certo", async () => {
    await db.member.update({ where: { id: sozinho.id }, data: { email: email("sozinho"), portal: false } })
    expect(await resolverAcesso([email("sozinho")])).toEqual({ tipo: "sem-acesso" })
    expect(await resolverAcesso([])).toEqual({ tipo: "sem-acesso" })
  })

  it("com o portal liberado, vê só a si mesmo (o e-mail não diferencia maiúsculas)", async () => {
    await liberar(sozinho.id, email("sozinho"))
    expect(ids(await resolverAcesso([email("SOZINHO").toUpperCase()]))).toEqual([sozinho.id])
  })

  it("cortar o portal tira o acesso na hora", async () => {
    await db.member.update({ where: { id: sozinho.id }, data: { portal: false } })
    expect(await resolverAcesso([email("sozinho")])).toEqual({ tipo: "sem-acesso" })
  })

  it("responsável vê a si mesmo e os filhos menores de 18, nunca o cônjuge com e-mail próprio", async () => {
    await liberar(familia.pai.id, email("pai"))
    await liberar(familia.mae.id, email("mae"))
    const menores = familia.filhos.map((f) => f.id)
    expect(ids(await resolverAcesso([email("pai")]))).toEqual([familia.pai.id, ...menores].sort())
    expect(ids(await resolverAcesso([email("mae")]))).toEqual([familia.mae.id, ...menores].sort())
  })

  it("filho que fez 18 anos sai da visão dos pais", async () => {
    const [filho] = familia.filhos
    await db.member.update({ where: { id: filho.id }, data: { nascimento: new Date("2000-01-01") } })
    expect(ids(await resolverAcesso([email("pai")]))).not.toContain(filho.id)
  })

  it("casal com um e-mail só vê os dois", async () => {
    await liberar(familia.mae.id, email("pai"))
    const visiveis = ids(await resolverAcesso([email("pai")]))
    expect(visiveis).toContain(familia.pai.id)
    expect(visiveis).toContain(familia.mae.id)
    await liberar(familia.mae.id, email("mae"))
  })

  it("o mesmo e-mail em cadastros de famílias diferentes é recusado", async () => {
    await liberar(sozinho.id, email("pai"))
    expect(await resolverAcesso([email("pai")])).toMatchObject({ tipo: "conflito" })
    await db.member.update({ where: { id: sozinho.id }, data: { email: email("sozinho"), portal: false } })
  })

  it("o mesmo e-mail com portal em duas igrejas pede para escolher", async () => {
    const la = await db.member.findFirstOrThrow({ where: { churchId: outra.id, familyId: null, status: "ativo" } })
    await liberar(la.id, email("pai"))
    const a = await resolverAcesso([email("pai")])
    expect(a.tipo === "escolher" && a.igrejas.map((i) => i.id).sort()).toEqual([igreja.id, outra.id].sort())
    expect(ids(await resolverAcesso([email("pai")], outra.id))).toEqual([la.id])
    await db.member.update({ where: { id: la.id }, data: { portal: false } })
  })

  it("transferido não entra", async () => {
    await liberar(sozinho.id, email("sozinho"), { status: "transferido" })
    expect(await resolverAcesso([email("sozinho")])).toEqual({ tipo: "sem-acesso" })
    await db.member.update({ where: { id: sozinho.id }, data: { status: "ativo", portal: false } })
  })
})

describe("dados do portal", () => {
  it("traz a pessoa, a célula, as escolas e a agenda, sem nada de outras pessoas além dos líderes", async () => {
    const comCelula = await db.member.findFirstOrThrow({ where: { churchId: igreja.id, cellId: { not: null }, enrollments: { some: {} } } })
    const d = await carregarPortal(igreja.id, comCelula.id)
    expect(d.membro.id).toBe(comCelula.id)
    expect(d.celula?.lideres.length).toBeGreaterThan(0)
    expect(d.celula!.presencas).toBeLessThanOrEqual(d.celula!.reunioes)
    expect(d.escolas.length).toBeGreaterThan(0)
    for (const e of d.escolas) expect(e.presencas).toBeLessThanOrEqual(e.aulas)
    expect(Object.keys(d).sort()).toEqual(["celula", "certificados", "church", "escolas", "eventos", "membro"])
    // Dos líderes só vai o nome: telefone e e-mail deles não podem aparecer (o endereço da célula é o do anfitrião, de propósito).
    const lideres = await db.member.findMany({ where: { cellRoles: { some: { cellId: comCelula.cellId! } }, id: { not: comCelula.id } } })
    const json = JSON.stringify(d)
    for (const l of lideres) for (const dado of [l.telefone, l.email].filter(Boolean)) expect(json).not.toContain(dado)
  })

  it("não carrega pessoa de outra igreja", async () => {
    await expect(carregarPortal(outra.id, familia.pai.id)).rejects.toThrow()
  })
})

describe("secretaria libera o portal", () => {
  it("libera e corta, com histórico; sem e-mail não libera", async () => {
    await logar(await criarUsuario(igreja.id, "secretaria"))
    const semEmail = await db.member.findFirstOrThrow({ where: { churchId: igreja.id, familyId: null, id: { not: sozinho.id } } })
    await db.member.update({ where: { id: semEmail.id }, data: { email: "" } })
    expect((await setPortalAccess({ membroId: semEmail.id, portal: true })).ok).toBe(false)

    expect(await setPortalAccess({ membroId: sozinho.id, portal: true })).toEqual({ ok: true, data: true })
    expect(await setPortalAccess({ membroId: sozinho.id, portal: false })).toEqual({ ok: true, data: false })
    expect(await db.auditLog.count({ where: { churchId: igreja.id, descricao: { contains: "portal do membro" } } })).toBe(2)
  })

  it("libera em lote só para quem tem e-mail e não foi transferido", async () => {
    const r = await enablePortalForAll()
    expect(r.ok && r.data.length).toBeGreaterThan(0)
    expect(await db.member.count({ where: { churchId: igreja.id, portal: true, OR: [{ email: "" }, { status: { in: ["transferido", "visitante"] } }] } })).toBe(0)
  })

  it("secretaria de filial só libera na filial dela", async () => {
    const leste = await filialPorNome(igreja.id, "Congregação Leste")
    await logar(await criarUsuario(igreja.id, "secretaria", { congregationId: leste.id }))
    const daSede = await db.member.findFirstOrThrow({ where: { churchId: igreja.id, congregationId: { not: leste.id }, email: { not: "" } } })
    expect((await setPortalAccess({ membroId: daSede.id, portal: false })).ok).toBe(false)
  })

  it("líder e tesouraria não liberam; outra igreja também não", async () => {
    // O "liberar em lote" do teste anterior ligou o portal desta pessoa.
    await db.member.update({ where: { id: sozinho.id }, data: { portal: false } })
    for (const papel of ["lider", "tesouraria"] as const) {
      await logar(await criarUsuario(igreja.id, papel))
      expect(await setPortalAccess({ membroId: sozinho.id, portal: true })).toEqual(NEGADO)
    }
    await logar(await criarUsuario(outra.id, "secretaria"))
    expect((await setPortalAccess({ membroId: sozinho.id, portal: true })).ok).toBe(false)
    expect(await db.member.findUniqueOrThrow({ where: { id: sozinho.id } })).toMatchObject({ portal: false })
  })
})
