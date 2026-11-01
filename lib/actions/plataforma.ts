"use server"

import { z } from "zod"

import type { ActionResult } from "../action"
import { ActionError } from "../church"
import { db } from "../db"
import { donoDaPlataforma } from "../plataforma"
import { idSchema } from "../validations"

// Ações do painel do dono da plataforma (/admin). Cada uma confere se a conta é dona (lib/plataforma.ts) e fica
// registrada em PlatformLog, que sobrevive à igreja apagada.

const bloquearSchema = z.object({ churchId: idSchema, motivo: z.string().trim().min(3, "Diga o motivo").max(300) })
const apagarSchema = z.object({ churchId: idSchema, confirmacao: z.string().trim() })

async function comoDono<T>(fn: (email: string) => Promise<T>): Promise<ActionResult<T>> {
  const email = await donoDaPlataforma()
  if (!email) return { ok: false, error: "Só o dono da plataforma pode fazer isso." }
  try {
    return { ok: true, data: await fn(email) }
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message }
    console.error("[plataforma]", e)
    return { ok: false, error: "Não foi possível concluir. Tente de novo." }
  }
}

const igreja = async (id: string) => {
  const c = await db.church.findUnique({ where: { id } })
  if (!c) throw new ActionError("Igreja não encontrada.")
  return c
}

/** Ninguém da equipe nem do portal entra enquanto estiver bloqueada; os dados ficam guardados. */
export async function bloquearIgreja(input: z.input<typeof bloquearSchema>) {
  return comoDono(async (email) => {
    const r = bloquearSchema.safeParse(input)
    if (!r.success) throw new ActionError(r.error.issues[0].message)
    const c = await igreja(r.data.churchId)
    await db.$transaction([
      db.church.update({ where: { id: c.id }, data: { bloqueada: true, bloqueioMotivo: r.data.motivo } }),
      db.platformLog.create({ data: { adminEmail: email, acao: `Bloqueou (${r.data.motivo})`, churchId: c.id, churchNome: c.nome } }),
    ])
  })
}

export async function desbloquearIgreja(churchId: string) {
  return comoDono(async (email) => {
    const id = idSchema.safeParse(churchId)
    if (!id.success) throw new ActionError("Igreja não encontrada.")
    const c = await igreja(id.data)
    await db.$transaction([
      db.church.update({ where: { id: c.id }, data: { bloqueada: false, bloqueioMotivo: null } }),
      db.platformLog.create({ data: { adminEmail: email, acao: "Desbloqueou", churchId: c.id, churchNome: c.nome } }),
    ])
  })
}

/** Apaga a igreja e tudo dela, sem volta. Pede o nome exato da igreja como confirmação. */
export async function apagarIgreja(input: z.input<typeof apagarSchema>) {
  return comoDono(async (email) => {
    const r = apagarSchema.safeParse(input)
    if (!r.success) throw new ActionError("Dados inválidos.")
    const c = await igreja(r.data.churchId)
    if (r.data.confirmacao !== c.nome) throw new ActionError("Digite o nome da igreja exatamente como aparece para confirmar.")
    // Usuários restritos a uma filial seguram a filial (Restrict): solta antes de apagar.
    await db.$transaction([
      db.churchUser.updateMany({ where: { churchId: c.id }, data: { congregationId: null } }),
      db.church.delete({ where: { id: c.id } }),
      db.platformLog.create({ data: { adminEmail: email, acao: "Apagou a igreja e todos os dados dela", churchId: c.id, churchNome: c.nome } }),
    ])
  })
}
