import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { updateChurch } from "@/lib/actions/church"
import { apagarIgreja, bloquearIgreja, desbloquearIgreja } from "@/lib/actions/plataforma"
import { sessaoDaEquipe } from "@/lib/church"
import { db } from "@/lib/db"
import type { Church } from "@/lib/generated/prisma/client"
import { contaLogada } from "@/lib/login"
import { donoDaPlataforma, listarIgrejas } from "@/lib/plataforma"
import { resolverAcesso } from "@/lib/portal"

import { apagarIgrejasDeTeste, criarIgreja, criarUsuario, logar, PREFIXO } from "./helpers"

// Dono da plataforma (/admin): só quem está em PLATFORM_ADMIN_EMAILS bloqueia ou apaga igrejas, e tudo fica em
// PlatformLog. Igreja bloqueada não abre para a equipe nem para o portal. CNPJ é único entre as igrejas.

vi.mock("@/lib/login", () => ({ contaLogada: vi.fn() }))
const marca = `${process.env.GITHUB_RUN_ID ?? "local"}-${Date.now()}`
const DONO = `dono-${marca}@plataforma.teste`
const entrarComo = (email: string) => vi.mocked(contaLogada).mockResolvedValue({ userId: `clerk-${email}`, nome: "X", emails: [email] })
const NAO_DONO = { ok: false, error: "Só o dono da plataforma pode fazer isso." }

let a: Church
let b: Church

beforeAll(async () => {
  await apagarIgrejasDeTeste()
  vi.stubEnv("PLATFORM_ADMIN_EMAILS", `outro@x.teste, ${DONO.toUpperCase()}`)
  a = await criarIgreja("Plataforma A")
  b = await criarIgreja("Plataforma B")
})

afterAll(async () => {
  vi.unstubAllEnvs()
  await apagarIgrejasDeTeste()
})

describe("quem é dono", () => {
  it("só o e-mail verificado que está na lista (sem diferenciar maiúsculas)", async () => {
    entrarComo(DONO)
    expect(await donoDaPlataforma()).toBe(DONO)
    entrarComo(`intruso-${marca}@x.teste`)
    expect(await donoDaPlataforma()).toBeNull()
    vi.mocked(contaLogada).mockResolvedValueOnce(null)
    expect(await donoDaPlataforma()).toBeNull()
  })

  it("sem a variável, ninguém é dono", async () => {
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", "")
    entrarComo(DONO)
    expect(await donoDaPlataforma()).toBeNull()
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", DONO)
  })

  it("quem não é dono não bloqueia, não desbloqueia nem apaga", async () => {
    entrarComo(`intruso-${marca}@x.teste`)
    expect(await bloquearIgreja({ churchId: a.id, motivo: "teste" })).toEqual(NAO_DONO)
    expect(await desbloquearIgreja(a.id)).toEqual(NAO_DONO)
    expect(await apagarIgreja({ churchId: a.id, confirmacao: a.nome })).toEqual(NAO_DONO)
    expect(await db.church.findUnique({ where: { id: a.id } })).toMatchObject({ bloqueada: false })
  })
})

describe("bloquear e apagar", () => {
  beforeAll(() => entrarComo(DONO))

  it("igreja bloqueada não abre para a equipe nem para o portal; desbloquear devolve o acesso", async () => {
    const clerk = `clerk-equipe-${marca}`
    await criarUsuario(a.id, "secretaria", { clerkUserId: clerk })
    const membro = await db.member.findFirstOrThrow({ where: { churchId: a.id, status: "ativo" } })
    const email = `membro-${marca}@portal.teste`
    await db.member.update({ where: { id: membro.id }, data: { email, portal: true } })
    expect((await resolverAcesso([email])).tipo).toBe("ok")

    expect((await bloquearIgreja({ churchId: a.id, motivo: "cadastro duplicado" })).ok).toBe(true)
    await expect(sessaoDaEquipe(clerk, a.id, async () => [])).rejects.toThrow("Esta igreja está bloqueada no Rebanho. Fale com o suporte.")
    expect(await resolverAcesso([email])).toEqual({ tipo: "sem-acesso" })

    expect((await desbloquearIgreja(a.id)).ok).toBe(true)
    expect((await sessaoDaEquipe(clerk, a.id, async () => [])).church.id).toBe(a.id)
    expect((await resolverAcesso([email])).tipo).toBe("ok")
  })

  it("bloquear exige motivo", async () => {
    expect(await bloquearIgreja({ churchId: a.id, motivo: "" })).toEqual({ ok: false, error: "Diga o motivo" })
  })

  it("apagar exige o nome exato e apaga tudo; o registro fica", async () => {
    expect((await apagarIgreja({ churchId: b.id, confirmacao: "outro nome" })).ok).toBe(false)
    expect((await apagarIgreja({ churchId: b.id, confirmacao: b.nome })).ok).toBe(true)
    expect(await db.church.findUnique({ where: { id: b.id } })).toBeNull()
    expect(await db.member.count({ where: { churchId: b.id } })).toBe(0)
    const log = await db.platformLog.findMany({ where: { churchId: { in: [a.id, b.id] } }, orderBy: { createdAt: "asc" } })
    expect(log.map((l) => l.acao)).toEqual(["Bloqueou (cadastro duplicado)", "Desbloqueou", "Apagou a igreja e todos os dados dela"])
    expect(log.every((l) => l.adminEmail === DONO)).toBe(true)
    await db.platformLog.deleteMany({ where: { churchId: { in: [a.id, b.id] } } })
  })

  it("a lista marca nomes repetidos (sem acento e maiúsculas) como possível clone", async () => {
    const clone = await db.church.create({ data: { nome: `${PREFIXO}PLATAFORMA Á` } })
    const outra = await db.church.create({ data: { nome: `${PREFIXO}plataforma a` } })
    const lista = await listarIgrejas()
    expect(lista.find((i) => i.id === clone.id)?.nomeRepetido).toBe(true)
    expect(lista.find((i) => i.id === outra.id)?.nomeRepetido).toBe(true)
  })
})

describe("CNPJ único", () => {
  it("não aceita o mesmo CNPJ em outra igreja, com ou sem pontuação", async () => {
    const dados = (cnpj: string) => ({
      nome: `${PREFIXO}Plataforma CNPJ`, sigla: "", cnpj, pastor: "", telefone: "", email: "",
      endereco: { rua: "", numero: "", bairro: "", cidade: "", uf: "", cep: "" }, lat: -16.7, lng: -49.2,
    })
    await logar(await criarUsuario(a.id, "admin"))
    const primeira = await updateChurch(dados("11.222.333/0001-81"))
    expect(primeira).toEqual({ ok: true, data: expect.anything() })
    const c = await criarIgreja("Plataforma C")
    await logar(await criarUsuario(c.id, "admin"))
    expect(await updateChurch(dados("11222333000181"))).toEqual({
      ok: false,
      error: "Este CNPJ já está cadastrado em outra igreja do Rebanho. Se a igreja é sua, fale com o suporte.",
    })
    // A própria igreja pode salvar de novo com o mesmo CNPJ.
    await logar((await db.churchUser.findFirstOrThrow({ where: { churchId: a.id, papel: "admin" } })))
    expect((await updateChurch(dados("11222333000181"))).ok).toBe(true)
    // O banco também garante, mesmo sem passar pela tela.
    await expect(db.church.update({ where: { id: c.id }, data: { cnpj: "11.222.333/0001-81" } })).rejects.toThrow()
  })
})
