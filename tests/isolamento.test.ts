import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createCell, deleteCell, saveCellMeeting } from "@/lib/actions/cells"
import { removeFilial } from "@/lib/actions/church"
import { issueCertificates } from "@/lib/actions/certificates"
import { createMember, deleteMember, updateMember } from "@/lib/actions/members"
import { updateUser } from "@/lib/actions/users"
import { createVisit } from "@/lib/actions/visits"
import { loadAppData } from "@/lib/data"
import { db } from "@/lib/db"
import type { Church } from "@/lib/generated/prisma/client"

import { apagarIgrejasDeTeste, criarIgreja, criarUsuario, filialPorNome, logar, membro, visita } from "./helpers"

// Uma igreja nunca vê nem altera nada de outra, mesmo sabendo os ids (que aparecem em URLs).

let A: Church
let B: Church
let membroDeB: string
let celulaDeB: string

beforeAll(async () => {
  await apagarIgrejasDeTeste()
  ;[A, B] = [await criarIgreja("Isolamento A"), await criarIgreja("Isolamento B")]
  membroDeB = (await db.member.findFirstOrThrow({ where: { churchId: B.id } })).id
  celulaDeB = (await db.cell.findFirstOrThrow({ where: { churchId: B.id } })).id
  await logar(await criarUsuario(A.id, "admin"))
})

afterAll(apagarIgrejasDeTeste)

describe("isolamento entre igrejas", () => {
  it("o painel de A não traz nada de B", async () => {
    const d = await loadAppData({ church: A, user: await criarUsuario(A.id, "admin") })
    const idsDeB = new Set((await db.member.findMany({ where: { churchId: B.id }, select: { id: true } })).map((m) => m.id))
    expect(d.members.length).toBeGreaterThan(0)
    expect(d.members.some((m) => idsDeB.has(m.id))).toBe(false)
    expect(d.cells.some((c) => c.id === celulaDeB)).toBe(false)
    expect(d.church.nome).toBe(A.nome)
  })

  it("não altera nem apaga membro de outra igreja", async () => {
    expect((await updateMember(membroDeB, membro({ nome: "Invadido" }))).ok).toBe(false)
    expect((await deleteMember(membroDeB)).ok).toBe(false)
    const intacto = await db.member.findUniqueOrThrow({ where: { id: membroDeB } })
    expect(intacto.nome).not.toBe("Invadido")
  })

  it("não registra visita nem certificado para membro de outra igreja", async () => {
    expect(await createVisit(visita(membroDeB))).toMatchObject({ ok: false, error: "Pessoa não encontrada nesta igreja." })
    const r = await issueCertificates({ membroIds: [membroDeB], tipo: "Batismo", estilo: "classico", emitidoEm: "2026-10-01", detalhe: "" })
    expect(r.ok).toBe(false)
  })

  it("não mexe em célula de outra igreja", async () => {
    expect((await deleteCell(celulaDeB)).ok).toBe(false)
    const r = await saveCellMeeting({ celulaId: celulaDeB, data: "2026-10-01", presentes: [], visitantes: [], observacoes: "" })
    expect(r.ok).toBe(false)
    expect(await db.cell.findUnique({ where: { id: celulaDeB } })).not.toBeNull()
  })

  it("não põe membro de outra igreja numa célula", async () => {
    const r = await createCell({
      nome: "Célula Invasora",
      congregacao: "",
      horario: "",
      endereco: membro().endereco,
      lat: 0,
      lng: 0,
      lideres: [membroDeB],
      colideres: [],
      anfitrioes: [],
      membroIds: [],
    })
    expect(r).toMatchObject({ ok: false, error: "Pessoa não encontrada nesta igreja." })
  })

  it("não altera usuário nem exclui filial de outra igreja", async () => {
    const userDeB = await criarUsuario(B.id, "secretaria")
    expect((await updateUser(userDeB.id, { papel: "admin" })).ok).toBe(false)
    expect((await db.churchUser.findUniqueOrThrow({ where: { id: userDeB.id } })).papel).toBe("secretaria")
    expect((await removeFilial((await filialPorNome(B.id, "Congregação Leste")).id)).ok).toBe(false)
  })

  it("ignora churchId enviado pelo navegador (o servidor decide a igreja)", async () => {
    const r = await createMember({ ...membro({ nome: "Tentou Outra Igreja" }), churchId: B.id } as never)
    expect(r.ok).toBe(true)
    const salvo = await db.member.findFirstOrThrow({ where: { nome: "Tentou Outra Igreja" } })
    expect(salvo.churchId).toBe(A.id)
  })
})
