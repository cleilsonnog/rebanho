"use server"

import { z } from "zod"
import { clerkClient } from "@clerk/nextjs/server"

import { secureAction } from "../action"
import { db } from "../db"
import { congregationNames, toChurch, toWhatsApp } from "../data"
import { ActionError } from "../church"
import { clearChurchData, insertDemoData } from "../demo"
import { geocodeEndereco } from "../geocode"
import { limitar } from "../rate-limit"
import { churchSchema, whatsappSchema } from "../validations"

export async function updateChurch(input: z.input<typeof churchSchema>) {
  return secureAction("configuracoes", churchSchema, input, async ({ endereco, congregacoes, ...c }, { church }) => {
    const atuais = await db.congregation.findMany({ where: { churchId: church.id } })
    const novas = new Set(congregacoes.map((n) => n.toLowerCase()))
    const existentes = new Set(atuais.map((a) => a.nome.toLowerCase()))

    // Localiza a igreja quando o endereço muda; ela vira o centro dos mapas do painel.
    const mudou = (["rua", "numero", "bairro", "cidade", "uf", "cep"] as const).some((k) => church[k].trim() !== endereco[k])
    let posicao = {}
    if (mudou || church.lat === null) {
      await limitar("geocodificacao", church.id)
      const p = endereco.cidade ? await geocodeEndereco(endereco) : null
      posicao = { lat: p?.lat ?? null, lng: p?.lng ?? null }
    }

    const [row] = await db.$transaction([
      db.church.update({ where: { id: church.id }, data: { ...c, ...endereco, ...posicao } }),
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

/**
 * Apaga membros, células, visitas, financeiro, agenda e certificados da igreja (ex.: tirar os dados de exemplo).
 * Mantém o cadastro da igreja, a logo e os usuários. Só o admin, e só digitando APAGAR.
 */
export async function clearData(confirmacao: string) {
  return secureAction(null, z.literal("APAGAR", "Digite APAGAR para confirmar"), confirmacao, async (_, { church }) => {
    await limitar("demo", church.id)
    await db.$transaction(
      async (tx) => {
        await clearChurchData(tx, church.id)
        await tx.congregation.create({ data: { churchId: church.id, nome: "Sede" } })
      },
      { timeout: 30_000 }
    )
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

const logoSchema = z
  .instanceof(File, { message: "Escolha uma imagem" })
  .refine((f) => ["image/png", "image/jpeg", "image/webp"].includes(f.type), "Use uma imagem PNG, JPG ou WebP")
  .refine((f) => f.size <= 1_000_000, "A imagem deve ter no máximo 1 MB")

/** Envia a logo para a organização no Clerk (que guarda a imagem) e anota o endereço dela na igreja. */
export async function updateLogo(form: FormData) {
  return secureAction("configuracoes", logoSchema, form.get("logo"), async (file, { church, user }) => {
    if (!church.clerkOrgId) throw new ActionError("Igreja sem organização no Clerk.")
    const clerk = await clerkClient()
    const org = await clerk.organizations.updateOrganizationLogo(church.clerkOrgId, {
      file,
      uploaderUserId: user.clerkUserId ?? undefined,
    })
    await db.church.update({ where: { id: church.id }, data: { logoUrl: org.imageUrl } })
    return org.imageUrl
  })
}

export async function removeLogo() {
  return secureAction("configuracoes", z.undefined(), undefined, async (_, { church }) => {
    if (church.clerkOrgId) await (await clerkClient()).organizations.deleteOrganizationLogo(church.clerkOrgId)
    await db.church.update({ where: { id: church.id }, data: { logoUrl: null } })
  })
}
