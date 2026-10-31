"use server"

import { z } from "zod"

import { db } from "../db"
import { portalAction } from "../portal"
import { correctionSchema } from "../validations"

// Ações do próprio membro no portal (/membro). Passam por `portalAction`, que confere o acesso pelo e-mail.

/**
 * O membro pede para corrigir telefone, e-mail ou endereço (ou descreve outra correção). Só os campos que mudaram
 * são guardados; um pedido novo substitui o que ainda estava esperando a secretaria.
 */
export async function requestCorrection(input: z.input<typeof correctionSchema>) {
  return portalAction(correctionSchema, input, async ({ membroId, telefone, email, endereco, observacao }, { churchId }) => {
    const m = await db.member.findFirstOrThrow({ where: { id: membroId, churchId } })
    const atual = { rua: m.rua, numero: m.numero, bairro: m.bairro, cidade: m.cidade, uf: m.uf.trim(), cep: m.cep }
    const mudou = {
      telefone: telefone !== m.telefone ? telefone : null,
      email: email.toLowerCase() !== m.email.toLowerCase() ? email : null,
      endereco: (Object.keys(atual) as (keyof typeof atual)[]).some((k) => endereco[k] !== atual[k]) ? endereco : undefined,
    }
    if (mudou.telefone === null && mudou.email === null && !mudou.endereco && !observacao)
      return { enviado: false as const }
    await db.$transaction([
      db.memberCorrection.deleteMany({ where: { memberId: m.id, status: "pendente" } }),
      db.memberCorrection.create({ data: { churchId, memberId: m.id, ...mudou, observacao } }),
    ])
    return { enviado: true as const }
  })
}
