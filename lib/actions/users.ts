"use server"

import type { z } from "zod"

import { secureAction } from "../action"
import { ActionError } from "../church"
import { db } from "../db"
import { assertMembers, toUser, userInclude } from "../data"
import { ROLE_LABEL } from "../format"
import { limitar } from "../rate-limit"
import { idSchema, inviteSchema, updateUserSchema } from "../validations"

// Gestão de usuários é só do admin (área `null` no secureAction). O convite é só um registro com o e-mail:
// a pessoa entra no Rebanho com esse e-mail (confirmado no login) e o acesso é ligado na hora (lib/church.ts ›
// vincularConvites). O link vai pelo WhatsApp ou é copiado na tela; não há limite de pessoas por igreja.

/** Id da filial pelo nome; vazio = igreja toda. A restrição por filial só vale para secretaria e pastor. */
async function filialId(churchId: string, nome: string | null | undefined, papel: string) {
  if (!nome || (papel !== "secretaria" && papel !== "pastor")) return null
  const c = await db.congregation.findFirst({ where: { churchId, nome }, select: { id: true } })
  if (!c) throw new ActionError(`A filial "${nome}" não existe.`)
  return c.id
}

export async function inviteUser(input: z.input<typeof inviteSchema>) {
  return secureAction(null, inviteSchema, input, async ({ nome, email, papel, memberId, congregacao, celulaId, funcaoCelula = "lider" }, { church }, registrar) => {
    if (memberId) await assertMembers(church.id, [memberId])
    // Líder de célula já entra na célula escolhida (no máximo 2 líderes e 2 colíderes por célula).
    const celula = papel === "lider" && memberId && celulaId
      ? await db.cell.findFirst({ where: { id: celulaId, churchId: church.id }, include: { leaders: true } })
      : null
    if (papel === "lider" && celulaId && !celula) throw new ActionError("Célula não encontrada.")
    if (celula && !celula.leaders.some((l) => l.memberId === memberId && l.funcao === funcaoCelula)) {
      if (celula.leaders.filter((l) => l.funcao === funcaoCelula).length >= 2)
        throw new ActionError(`A célula ${celula.nome} já tem 2 ${funcaoCelula === "lider" ? "líderes" : "colíderes"}. Escolha outra função ou outra célula.`)
    }
    const congregationId = await filialId(church.id, congregacao, papel)
    await limitar("convite", church.id)
    if (await db.churchUser.findFirst({ where: { churchId: church.id, email: email.toLowerCase() } }))
      throw new ActionError("Esse e-mail já está na equipe desta igreja.")
    const [row] = await db.$transaction([
      db.churchUser.create({
        data: { churchId: church.id, nome, email: email.toLowerCase(), papel, memberId, congregationId },
        include: userInclude,
      }),
      ...(celula && memberId
        ? [db.cellLeader.createMany({ data: [{ cellId: celula.id, memberId, funcao: funcaoCelula }], skipDuplicates: true })]
        : []),
    ])
    const onde = celula ? ` (${funcaoCelula === "lider" ? "líder" : "colíder"} da célula ${celula.nome})` : ""
    registrar(`Convidou ${nome} (${email}) como ${ROLE_LABEL[papel]}${onde}`)
    return toUser(row)
  })
}

export async function updateUser(id: string, input: z.input<typeof updateUserSchema>) {
  const schema = updateUserSchema.extend({ id: idSchema })
  return secureAction(null, schema, { ...input, id }, async ({ id, congregacao, ...data }, { church, user }, registrar) => {
    // Impede o admin de se rebaixar ou se desativar e deixar a igreja sem administrador.
    if (id === user.id && (data.papel || data.ativo !== undefined)) throw new ActionError("Você não pode alterar o seu próprio acesso.")
    if (data.memberId) await assertMembers(church.id, [data.memberId])
    const atual = await db.churchUser.findUniqueOrThrow({ where: { id, churchId: church.id } })
    const papel = data.papel ?? atual.papel
    // Trocar para uma função sem filial (ex.: tesouraria) limpa a restrição; mudar a filial só se veio no pedido.
    const congregationId =
      congregacao !== undefined ? await filialId(church.id, congregacao, papel) : papel === "secretaria" || papel === "pastor" ? undefined : null
    const row = await db.churchUser.update({ where: { id, churchId: church.id }, data: { ...data, congregationId }, include: userInclude })
    const mudancas = [
      papel !== atual.papel && `função: ${ROLE_LABEL[atual.papel]} → ${ROLE_LABEL[papel]}`,
      data.ativo === false && atual.ativo && "acesso desativado",
      data.ativo && !atual.ativo && "acesso reativado",
      row.congregationId !== atual.congregationId && `filial: ${row.congregation?.nome ?? "igreja toda"}`,
    ].filter(Boolean)
    registrar(`Alterou o usuário ${row.nome}${mudancas.length ? ` (${mudancas.join(", ")})` : ""}`)
    return toUser(row)
  })
}

export async function removeUser(id: string) {
  return secureAction(null, idSchema, id, async (id, { church, user }, registrar) => {
    if (id === user.id) throw new ActionError("Você não pode remover a si mesmo.")
    const alvo = await db.churchUser.findUniqueOrThrow({ where: { id, churchId: church.id } })

    // Sem o registro, o login dessa pessoa não abre mais esta igreja.
    await db.churchUser.delete({ where: { id: alvo.id } })
    registrar(`Removeu o acesso de ${alvo.nome} (${alvo.email})`)
  })
}
