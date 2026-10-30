"use server"

import { z } from "zod"

import { secureAction } from "../action"
import { ActionError } from "../church"
import { db } from "../db"
import { filialDe, memberInclude, membrosScope, toDate, toMember } from "../data"
import type { ChurchUser } from "../generated/prisma/client"
import { aproximar, bairrosGuardados, chaveBairro, consultarBairro, espera, type Ponto } from "../geocode"
import { limitar } from "../rate-limit"
import { idSchema, importMembersSchema, memberSchema, type MemberInput } from "../validations"

type MemberData = z.output<typeof memberSchema>

async function congregacoes(churchId: string) {
  const cs = await db.congregation.findMany({ where: { churchId }, select: { id: true, nome: true } })
  return new Map(cs.map((c) => [c.nome.toLowerCase(), c]))
}

/** Id da sede/filial pelo nome. Quem é de uma filial só cadastra nela (sem filial informada, vai para a dela). */
function congregationId(mapa: Awaited<ReturnType<typeof congregacoes>>, nome: string, user: ChurchUser) {
  const minha = filialDe(user)
  if (!nome) return minha
  const c = mapa.get(nome.toLowerCase())
  if (!c) throw new ActionError(`A congregação "${nome}" não existe nesta igreja.`)
  if (minha && c.id !== minha) throw new ActionError("Você só pode cadastrar membros na sua filial.")
  return c.id
}

/**
 * Posição no mapa calculada no servidor (o que vem do navegador é ignorado): centro do bairro com desvio,
 * nunca a casa. Se o bairro não mudou, o pino fica onde estava.
 */
async function posicao(e: MemberData["endereco"], atual?: { bairro: string; cidade: string; uf: string; lat: number | null; lng: number | null }) {
  if (atual?.lat && atual.lng && chaveBairro(atual) === chaveBairro(e)) return { lat: atual.lat, lng: atual.lng }
  if (!e.bairro || !e.cidade) return aproximar(null)
  const guardado = (await bairrosGuardados([chaveBairro(e)])).get(chaveBairro(e))
  return aproximar(guardado !== undefined ? guardado : await consultarBairro(e))
}

function toRow({ endereco, congregacao: _c, nascimento, dataBatismo, membroDesde, observacoes, lat: _lat, lng: _lng, ...m }: MemberData) {
  return {
    ...m,
    ...endereco,
    nascimento: toDate(nascimento),
    dataBatismo: m.batizado && dataBatismo ? toDate(dataBatismo) : null,
    membroDesde: toDate(membroDesde),
    observacoes: observacoes ?? null,
  }
}

export async function createMember(input: MemberInput) {
  return secureAction("membros", memberSchema, input, async (m, { church, user }, registrar) => {
    const congs = await congregacoes(church.id)
    const row = await db.member.create({
      data: { ...toRow(m), ...(await posicao(m.endereco)), churchId: church.id, congregationId: congregationId(congs, m.congregacao, user) },
      include: memberInclude,
    })
    registrar(`Cadastrou o membro ${row.nome}`)
    return toMember(row)
  })
}

export async function updateMember(id: string, input: MemberInput) {
  const schema = z.object({ id: idSchema, member: memberSchema })
  return secureAction("membros", schema, { id, member: input }, async ({ id, member: m }, { church, user }, registrar) => {
    const congs = await congregacoes(church.id)
    const atual = await db.member.findFirstOrThrow({ where: { id, churchId: church.id, ...membrosScope(user) } })
    const row = await db.member.update({
      where: { id, churchId: church.id },
      data: { ...toRow(m), ...(await posicao(m.endereco, atual)), congregationId: congregationId(congs, m.congregacao, user) },
      include: memberInclude,
    })
    registrar(`Editou o cadastro de ${row.nome}`)
    return toMember(row)
  })
}

export async function deleteMember(id: string) {
  return secureAction("membros", idSchema, id, async (id, { church, user }, registrar) => {
    const row = await db.member.delete({ where: { id, churchId: church.id, ...membrosScope(user) } })
    registrar(`Excluiu o membro ${row.nome}`)
  })
}

export async function importMembers(input: MemberInput[]) {
  return secureAction("membros", importMembersSchema, input, async (ms, { church, user }, registrar) => {
    await limitar("importacao", user.id)
    const congs = await congregacoes(church.id)
    const nomes = new Map([...congs.values()].map((c) => [c.id, c.nome]))
    // Só bairros já guardados; os novos são localizados aos poucos pela tela do mapa (localizarMembros).
    const guardados = await bairrosGuardados(ms.map((m) => chaveBairro(m.endereco)))
    const rows = await db.member.createManyAndReturn({
      data: ms.map((m) => ({
        ...toRow(m),
        ...(guardados.get(chaveBairro(m.endereco)) ? aproximar(guardados.get(chaveBairro(m.endereco))) : { lat: null, lng: null }),
        churchId: church.id,
        congregationId: congregationId(congs, m.congregacao, user),
      })),
    })
    registrar(`Importou ${rows.length} membros`)
    return rows.map((r) => toMember({ ...r, congregation: r.congregationId ? { nome: nomes.get(r.congregationId)! } : null }))
  })
}

const semPosicao = { OR: [{ lat: null }, { lat: 0, lng: 0 }], bairro: { not: "" } }

/**
 * Coloca no mapa quem ainda está sem posição (ex.: depois de uma importação). Cada chamada consulta
 * no máximo 5 bairros novos, um por segundo; a tela chama de novo enquanto houver pendentes.
 */
export async function localizarMembros() {
  return secureAction("membros", z.undefined(), undefined, async (_, { church, user }) => {
    await limitar("geocodificacao", church.id)
    const pendentes = await db.member.findMany({
      where: { churchId: church.id, ...membrosScope(user), ...semPosicao },
      select: { id: true, bairro: true, cidade: true, uf: true },
      take: 500,
    })
    const chaves = [...new Set(pendentes.map(chaveBairro))]
    const centros: Map<string, Ponto | null> = await bairrosGuardados(chaves)
    for (const [i, chave] of chaves.filter((c) => !centros.has(c)).slice(0, 5).entries()) {
      if (i > 0) await espera(1100)
      centros.set(chave, await consultarBairro(pendentes.find((p) => chaveBairro(p) === chave)!))
    }

    const achados = pendentes.flatMap((m) => {
      const centro = centros.get(chaveBairro(m))
      return centro ? [{ id: m.id, ...aproximar(centro) }] : []
    })
    await db.$transaction(achados.map(({ id, lat, lng }) => db.member.update({ where: { id, churchId: church.id }, data: { lat, lng } })))

    // Bairros já tentados e não achados ficam fora da conta: não adianta tentar de novo.
    const tentados = await bairrosGuardados(chaves)
    const restantes = pendentes.filter((m) => !tentados.has(chaveBairro(m))).length
    const naoAchados = pendentes.filter((m) => tentados.get(chaveBairro(m)) === null).length
    return { atualizados: achados, restantes, naoAchados }
  })
}
