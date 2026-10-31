"use server"

import { z } from "zod"

import { secureAction } from "../action"
import { ActionError } from "../church"
import { db } from "../db"
import { assertMembers, membrosScope, toFamily } from "../data"
import type { Prisma } from "../generated/prisma/client"
import { copyAddressSchema, familySchema, idSchema } from "../validations"

// Famílias são montadas por quem cuida dos membros (área "membros"). Quem é de uma filial só mexe nas pessoas
// da filial dele: um familiar de outra filial continua na família, sem aparecer nem poder ser tirado por ele.

/** Apaga as famílias da igreja que ficaram sem ninguém e devolve os ids delas. */
async function apagarVazias(tx: Prisma.TransactionClient, churchId: string) {
  const vazias = await tx.family.findMany({ where: { churchId, members: { none: {} } }, select: { id: true } })
  await tx.family.deleteMany({ where: { id: { in: vazias.map((f) => f.id) } } })
  return vazias.map((f) => f.id)
}

/**
 * Cria a família ou grava a nova composição. Quem saiu da lista sai da família; quem estava em outra família
 * muda para esta (a outra é apagada se ficar vazia).
 */
export async function saveFamily(id: string | undefined, input: z.input<typeof familySchema>) {
  const schema = familySchema.extend({ id: idSchema.optional() })
  return secureAction("membros", schema, { ...input, id }, async ({ id, nome, membros }, { church, user }, registrar) => {
    const churchId = church.id
    const scope = membrosScope(user)
    const ids = membros.map((m) => m.id)
    await assertMembers(churchId, ids, scope)
    if (id && !(await db.family.findFirst({ where: { id, churchId } }))) throw new ActionError("Família não encontrada.")

    const r = await db.$transaction(async (tx) => {
      const f = id ? await tx.family.update({ where: { id, churchId }, data: { nome } }) : await tx.family.create({ data: { churchId, nome } })
      const sairam = await tx.member.findMany({ where: { churchId, ...scope, familyId: f.id, id: { notIn: ids } }, select: { id: true } })
      await tx.member.updateMany({ where: { id: { in: sairam.map((m) => m.id) } }, data: { familyId: null, parentesco: null } })
      for (const m of membros) await tx.member.update({ where: { id: m.id, churchId }, data: { familyId: f.id, parentesco: m.parentesco } })
      return { familia: toFamily(f), membros, removidos: sairam.map((m) => m.id), apagadas: await apagarVazias(tx, churchId) }
    })
    registrar(`${id ? "Editou" : "Criou"} a família ${nome} (${membros.length} ${membros.length === 1 ? "pessoa" : "pessoas"})`)
    return r
  })
}

/** Tira da família as pessoas que o usuário pode alterar; a família some se não sobrar ninguém. */
export async function deleteFamily(id: string) {
  return secureAction("membros", idSchema, id, async (id, { church, user }, registrar) => {
    const churchId = church.id
    const f = await db.family.findFirst({ where: { id, churchId } })
    if (!f) throw new ActionError("Família não encontrada.")
    const r = await db.$transaction(async (tx) => {
      const sairam = await tx.member.findMany({ where: { churchId, ...membrosScope(user), familyId: f.id }, select: { id: true } })
      await tx.member.updateMany({ where: { id: { in: sairam.map((m) => m.id) } }, data: { familyId: null, parentesco: null } })
      return { removidos: sairam.map((m) => m.id), apagadas: await apagarVazias(tx, churchId) }
    })
    registrar(`Desfez a família ${f.nome}`)
    return r
  })
}

/** Copia o endereço (e a posição no mapa) de um membro para os outros da família que o usuário pode alterar. */
export async function copyFamilyAddress(input: z.input<typeof copyAddressSchema>) {
  return secureAction("membros", copyAddressSchema, input, async ({ familiaId, membroId }, { church, user }, registrar) => {
    const churchId = church.id
    const scope = membrosScope(user)
    const origem = await db.member.findFirst({ where: { id: membroId, churchId, familyId: familiaId, ...scope }, include: { family: true } })
    if (!origem?.family) throw new ActionError("Essa pessoa não é desta família.")
    const { rua, numero, bairro, cidade, uf, cep, lat, lng } = origem
    const outros = await db.member.findMany({ where: { churchId, ...scope, familyId: familiaId, id: { not: membroId } }, select: { id: true } })
    const ids = outros.map((m) => m.id)
    await db.member.updateMany({ where: { id: { in: ids } }, data: { rua, numero, bairro, cidade, uf, cep, lat, lng } })
    registrar(`Copiou o endereço de ${origem.nome} para a família ${origem.family.nome}`)
    return { ids, endereco: { rua, numero, bairro, cidade, uf: uf.trim(), cep }, lat: lat ?? 0, lng: lng ?? 0 }
  })
}
