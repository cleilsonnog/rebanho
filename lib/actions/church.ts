"use server"

import { z } from "zod"
import { clerkClient } from "@clerk/nextjs/server"

import { secureAction } from "../action"
import { db } from "../db"
import { congregationNames, toChurch, toWhatsApp } from "../data"
import { clearChurchData, insertDemoData } from "../demo"
import { limitar } from "../rate-limit"
import { churchSchema, whatsappSchema } from "../validations"

export async function updateChurch(input: z.input<typeof churchSchema>) {
  return secureAction("configuracoes", churchSchema, input, async ({ endereco, congregacoes, ...c }, { church }) => {
    const atuais = await db.congregation.findMany({ where: { churchId: church.id } })
    const novas = new Set(congregacoes.map((n) => n.toLowerCase()))
    const existentes = new Set(atuais.map((a) => a.nome.toLowerCase()))

    const [row] = await db.$transaction([
      db.church.update({ where: { id: church.id }, data: { ...c, ...endereco } }),
      // Membros de uma congregação removida ficam sem congregação (onDelete: SetNull).
      db.congregation.deleteMany({
        where: { churchId: church.id, id: { in: atuais.filter((a) => !novas.has(a.nome.toLowerCase())).map((a) => a.id) } },
      }),
      db.congregation.createMany({
        data: congregacoes.filter((n) => !existentes.has(n.toLowerCase())).map((nome) => ({ churchId: church.id, nome })),
      }),
    ])

    // Mantém o nome da organização no Clerk igual ao da igreja (aparece no seletor de igrejas).
    if (c.nome !== church.nome && church.clerkOrgId) {
      const clerk = await clerkClient()
      await clerk.organizations.updateOrganization(church.clerkOrgId, { name: c.nome }).catch((e) => {
        console.error("[updateChurch] Clerk", e)
      })
    }
    return toChurch(row, await congregationNames(church.id))
  })
}

export async function updateWhatsApp(input: z.input<typeof whatsappSchema>) {
  return secureAction("whatsapp", whatsappSchema, input, async (w, { church }) => {
    const row = await db.church.update({
      where: { id: church.id },
      data: {
        whatsappConectado: w.conectado,
        whatsappNumero: w.numero,
        whatsappDiasAntes: w.diasAntecedencia,
        whatsappMensagem: w.mensagemAniversario,
        whatsappAutomatico: w.envioAutomatico,
      },
    })
    return toWhatsApp(row)
  })
}

/** Substitui todos os dados da igreja pelos de exemplo. Só o admin pode. */
export async function loadDemoData() {
  return secureAction(null, z.undefined(), undefined, async (_, { church }) => {
    await limitar("demo", church.id)
    await db.$transaction(
      async (tx) => {
        await clearChurchData(tx, church.id)
        await insertDemoData(tx, church.id)
      },
      { timeout: 30_000 }
    )
  })
}
