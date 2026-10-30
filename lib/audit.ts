import "server-only"

import type { Session } from "./church"
import { db } from "./db"
import type { Area } from "./permissions"

/** Por quanto tempo o histórico fica guardado. Depois disso é apagado pela rotina semanal (cron do backup). */
export const MESES_HISTORICO = 12

/** Grava no histórico as alterações de uma ação que deu certo. Falha aqui não desfaz a ação: só fica no log do servidor. */
export async function gravarHistorico({ church, user }: Session, area: Area | null, descricoes: string[]) {
  if (descricoes.length === 0) return
  try {
    await db.auditLog.createMany({
      data: descricoes.map((descricao) => ({
        churchId: church.id,
        userId: user.id,
        userNome: user.nome,
        papel: user.papel,
        area,
        descricao,
      })),
    })
  } catch (e) {
    console.error("[historico]", e)
  }
}

export async function limparHistorico(hoje = new Date()) {
  const limite = new Date(hoje)
  limite.setMonth(limite.getMonth() - MESES_HISTORICO)
  const { count } = await db.auditLog.deleteMany({ where: { createdAt: { lt: limite } } })
  return count
}
