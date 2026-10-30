import { timingSafeEqual } from "node:crypto"

import { limparHistorico } from "@/lib/audit"
import { backupSemanal } from "@/lib/backup"

// Chamada pela Vercel Cron todo domingo (vercel.json). A Vercel manda `Authorization: Bearer <CRON_SECRET>`;
// sem esse segredo a rota não faz nada, então ninguém de fora consegue disparar nem ver o resultado.
// Aproveita a rotina semanal para apagar o histórico de alterações com mais de 12 meses (lib/audit.ts).

export const maxDuration = 60

function autorizado(request: Request) {
  const segredo = process.env.CRON_SECRET
  if (!segredo) return false
  const recebido = Buffer.from(request.headers.get("authorization") ?? "")
  const esperado = Buffer.from(`Bearer ${segredo}`)
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado)
}

export async function GET(request: Request) {
  if (!autorizado(request)) return new Response("Não autorizado", { status: 401 })
  try {
    const historicoApagado = await limparHistorico().catch((e) => {
      console.error("[historico]", e)
      return null
    })
    const r = { ...(await backupSemanal()), historicoApagado }
    console.log("[backup]", r)
    return Response.json(r)
  } catch (e) {
    console.error("[backup]", e)
    return Response.json({ erro: "Falha no backup. Veja os logs da Vercel." }, { status: 500 })
  }
}
