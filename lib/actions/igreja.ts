"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { ActionError, COOKIE_IGREJA, criarIgrejaPara } from "../church"
import { db } from "../db"
import { contaLogada } from "../login"
import { limitar } from "../rate-limit"
import { idSchema, newChurchSchema } from "../validations"

// Tela /igreja: abrir uma das igrejas da conta ou cadastrar uma nova. Rodam antes de haver igreja na sessão,
// por isso não passam pelo `secureAction`; cada uma confere o login por conta própria.

async function abrir(churchId: string) {
  ;(await cookies()).set(COOKIE_IGREJA, churchId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 86_400,
  })
}

/** Abre a igreja no painel (só se a conta fizer parte da equipe dela). */
export async function escolherIgreja(churchId: string) {
  const { userId } = await auth({ treatPendingAsSignedOut: false })
  if (!userId) redirect("/entrar")
  const id = idSchema.safeParse(churchId)
  const vinculo = id.success && (await db.churchUser.findFirst({ where: { clerkUserId: userId, churchId: id.data } }))
  if (!vinculo) return { error: "Você não faz parte da equipe dessa igreja." }
  await abrir(vinculo.churchId)
  redirect("/app")
}

/** Cadastra a igreja com a conta como administradora e já abre o painel. Para `useActionState`. */
export async function criarIgreja(_: { error?: string } | undefined, form: FormData) {
  const conta = await contaLogada()
  if (!conta) redirect("/entrar")
  const nome = newChurchSchema.safeParse({ nome: form.get("nome") })
  if (!nome.success) return { error: nome.error.issues[0].message }
  if (!conta.emails[0]) return { error: "Confirme o seu e-mail no login antes de cadastrar a igreja." }
  let churchId
  try {
    await limitar("igreja", conta.userId)
    churchId = (await criarIgrejaPara({ clerkUserId: conta.userId, nome: conta.nome, email: conta.emails[0] }, nome.data.nome)).id
  } catch (e) {
    if (e instanceof ActionError) return { error: e.message }
    console.error("[criarIgreja]", e)
    return { error: "Não foi possível cadastrar a igreja. Tente de novo." }
  }
  await abrir(churchId)
  redirect("/app")
}
