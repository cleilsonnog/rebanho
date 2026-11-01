import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { GET as logo } from "@/app/logo/[id]/route"
import { removeLogo, updateLogo } from "@/lib/actions/church"
import { inviteUser, removeUser } from "@/lib/actions/users"
import { ActionError, SemIgreja, criarIgrejaPara, sessaoDaEquipe, vincularConvites } from "@/lib/church"
import { db } from "@/lib/db"
import type { Church } from "@/lib/generated/prisma/client"

import { apagarIgrejasDeTeste, criarIgreja, criarUsuario, logar, PREFIXO } from "./helpers"

// Login da equipe sem organizações do Clerk (lib/church.ts): a conta do Clerk é ligada ao convite pelo e-mail
// verificado, e a igreja aberta sai do cookie, desde que a conta faça parte da equipe dela.

const marca = `${process.env.GITHUB_RUN_ID ?? "local"}-${Date.now()}`
const conta = (nome: string) => `clerk-${nome}-${marca}`
const email = (nome: string) => `${nome}-${marca}@equipe.teste`
const semEmails = async () => [] as string[]

let a: Church
let b: Church

beforeAll(async () => {
  await apagarIgrejasDeTeste()
  a = await criarIgreja("Sessao A")
  b = await criarIgreja("Sessao B")
})

afterAll(apagarIgrejasDeTeste)

describe("quem entra e em qual igreja", () => {
  it("sem igreja nenhuma, pede para escolher ou cadastrar", async () => {
    await expect(sessaoDaEquipe(conta("ninguem"), undefined, semEmails)).rejects.toBeInstanceOf(SemIgreja)
  })

  it("o convite é ligado no primeiro acesso pelo e-mail verificado, sem diferenciar maiúsculas", async () => {
    const convite = await criarUsuario(a.id, "secretaria", { email: email("ana") })
    const s = await sessaoDaEquipe(conta("ana"), undefined, async () => [email("ANA").toUpperCase()])
    expect(s.church.id).toBe(a.id)
    expect(s.user).toMatchObject({ id: convite.id, papel: "secretaria", clerkUserId: conta("ana") })
  })

  it("e-mail diferente do convite não entra", async () => {
    await criarUsuario(a.id, "pastor", { email: email("beto") })
    await expect(sessaoDaEquipe(conta("intruso"), undefined, async () => [email("outro")])).rejects.toBeInstanceOf(SemIgreja)
    expect(await db.churchUser.findFirst({ where: { email: email("beto") } })).toMatchObject({ clerkUserId: null })
  })

  it("com duas igrejas, abre a do cookie; sem cookie (ou cookie de outra igreja), pede para escolher", async () => {
    await criarUsuario(a.id, "lider", { email: email("caio"), clerkUserId: conta("caio") })
    await criarUsuario(b.id, "tesouraria", { email: email("caio"), clerkUserId: conta("caio") })
    expect((await sessaoDaEquipe(conta("caio"), b.id, semEmails)).user.papel).toBe("tesouraria")
    expect((await sessaoDaEquipe(conta("caio"), a.id, semEmails)).user.papel).toBe("lider")
    await expect(sessaoDaEquipe(conta("caio"), undefined, semEmails)).rejects.toBeInstanceOf(SemIgreja)
    const estranha = await criarIgreja("Sessao C")
    await expect(sessaoDaEquipe(conta("caio"), estranha.id, semEmails)).rejects.toBeInstanceOf(SemIgreja)
  })

  it("o cookie de uma igreja em que a conta não está não dá acesso a ela", async () => {
    // Só da igreja A: o cookie da B é ignorado e abre a A.
    const s = await sessaoDaEquipe(conta("ana"), b.id, semEmails)
    expect(s.church.id).toBe(a.id)
  })

  it("um convite novo para outra igreja é ligado quando o cookie pede essa igreja", async () => {
    await criarUsuario(b.id, "pastor", { email: email("ana") })
    const s = await sessaoDaEquipe(conta("ana"), b.id, async () => [email("ana")])
    expect(s.church.id).toBe(b.id)
  })

  it("acesso desativado não entra", async () => {
    await criarUsuario(a.id, "secretaria", { email: email("davi"), clerkUserId: conta("davi"), ativo: false })
    await expect(sessaoDaEquipe(conta("davi"), a.id, semEmails)).rejects.toThrow("Seu acesso a esta igreja foi desativado pelo administrador.")
    await expect(sessaoDaEquipe(conta("davi"), a.id, semEmails)).rejects.not.toBeInstanceOf(SemIgreja)
  })

  it("convite repetido na igreja em que a conta já está não quebra nada", async () => {
    await criarUsuario(a.id, "lider", { email: email("ana-2") })
    await expect(vincularConvites(conta("ana"), [email("ana-2")])).resolves.toBeUndefined()
    expect(await db.churchUser.findFirst({ where: { email: email("ana-2") } })).toMatchObject({ clerkUserId: null })
  })

  it("cadastrar igreja cria a sede e a conta como administradora", async () => {
    const nova = await criarIgrejaPara({ clerkUserId: conta("eva"), nome: "Eva", email: email("EVA") }, `${PREFIXO}Nova`)
    const s = await sessaoDaEquipe(conta("eva"), undefined, semEmails)
    expect(s.church.id).toBe(nova.id)
    expect(s.user).toMatchObject({ papel: "admin", email: email("eva"), ativo: true })
    expect(await db.congregation.findMany({ where: { churchId: nova.id } })).toMatchObject([{ nome: "Sede" }])
  })
})

describe("convites e logo sem o Clerk", () => {
  beforeAll(async () => logar(await criarUsuario(a.id, "admin")))

  it("convida sem limite de 20 pessoas e recusa e-mail repetido", async () => {
    const antes = await db.churchUser.count({ where: { churchId: a.id } })
    for (let i = 0; i < 21; i++) {
      const r = await inviteUser({ nome: `Pessoa ${i}`, email: email(`lider${i}`), papel: "pastor" })
      if (!r.ok) throw new Error(r.error)
      expect(r.data.pendente).toBe(true)
    }
    expect(await db.churchUser.count({ where: { churchId: a.id } })).toBe(antes + 21)
    expect(await inviteUser({ nome: "De novo", email: email("LIDER0"), papel: "pastor" })).toEqual({ ok: false, error: "Esse e-mail já está na equipe desta igreja." })
  })

  it("líder convidado já entra na célula escolhida, respeitando 2 líderes por célula", async () => {
    const celula = await db.cell.findFirstOrThrow({ where: { churchId: a.id }, include: { leaders: true } })
    // As células de exemplo têm casal de colíderes: abre uma vaga.
    const colider = celula.leaders.find((l) => l.funcao === "colider")!
    await db.cellLeader.delete({ where: { cellId_memberId_funcao: { cellId: celula.id, memberId: colider.memberId, funcao: "colider" } } })
    const livre = await db.member.findFirstOrThrow({ where: { churchId: a.id, cellRoles: { none: {} } } })
    const r = await inviteUser({ nome: "Líder novo", email: email("lider-celula"), papel: "lider", memberId: livre.id, celulaId: celula.id, funcaoCelula: "colider" })
    if (!r.ok) throw new Error(r.error)
    expect(await db.cellLeader.findMany({ where: { cellId: celula.id, memberId: livre.id } })).toMatchObject([{ funcao: "colider" }])

    // A célula de exemplo tem casal de líderes: um terceiro líder é recusado.
    expect(celula.leaders.filter((l) => l.funcao === "lider")).toHaveLength(2)
    const outro = await db.member.findFirstOrThrow({ where: { churchId: a.id, cellRoles: { none: {} } } })
    const cheio = await inviteUser({ nome: "Terceiro", email: email("terceiro"), papel: "lider", memberId: outro.id, celulaId: celula.id, funcaoCelula: "lider" })
    expect(cheio).toEqual({ ok: false, error: `A célula ${celula.nome} já tem 2 líderes. Escolha outra função ou outra célula.` })
    expect(await db.churchUser.findFirst({ where: { email: email("terceiro") } })).toBeNull()

    // Célula de outra igreja não serve.
    const deB = await db.cell.findFirstOrThrow({ where: { churchId: b.id } })
    expect((await inviteUser({ nome: "X", email: email("x-celula"), papel: "lider", memberId: outro.id, celulaId: deB.id })).ok).toBe(false)
    expect(await db.cellLeader.count({ where: { cellId: deB.id, memberId: outro.id } })).toBe(0)
  })

  it("remover tira o acesso na hora", async () => {
    const u = await db.churchUser.findFirstOrThrow({ where: { churchId: a.id, email: email("ana") } })
    expect((await removeUser(u.id)).ok).toBe(true)
    await expect(sessaoDaEquipe(conta("ana"), a.id, semEmails)).resolves.toMatchObject({ church: { id: b.id } })
  })

  it("só o admin convida", async () => {
    await logar(await criarUsuario(a.id, "secretaria"))
    expect(await inviteUser({ nome: "X", email: email("x"), papel: "pastor" })).toEqual({ ok: false, error: "Sua função não permite fazer isso." })
    await logar(await criarUsuario(a.id, "admin"))
  })

  it("a logo fica no banco e é servida em /logo/[id]; remover apaga", async () => {
    const form = new FormData()
    form.set("logo", new File([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], "logo.png", { type: "image/png" }))
    const r = await updateLogo(form)
    if (!r.ok) throw new Error(r.error)
    expect(r.data).toMatch(new RegExp(`^/logo/${a.id}\\?v=\\d+$`))
    const resposta = await logo(new Request("http://localhost"), { params: Promise.resolve({ id: a.id }) })
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get("Content-Type")).toBe("image/png")
    expect(new Uint8Array(await resposta.arrayBuffer()).slice(0, 4)).toEqual(new Uint8Array([137, 80, 78, 71]))

    expect((await removeLogo()).ok).toBe(true)
    expect((await logo(new Request("http://localhost"), { params: Promise.resolve({ id: a.id }) })).status).toBe(404)
  })

  it("logo que não é imagem é recusada", async () => {
    const form = new FormData()
    form.set("logo", new File(["<svg onload=alert(1)>"], "x.svg", { type: "image/svg+xml" }))
    expect((await updateLogo(form)).ok).toBe(false)
  })
})

// Garante que o erro de "sem igreja" continua sendo um ActionError (as telas tratam os dois).
it("SemIgreja é um ActionError", () => expect(new SemIgreja()).toBeInstanceOf(ActionError))
