import "server-only"

import type { z } from "zod"

import { ActionError, getSession, type Session } from "./church"
import { Prisma } from "./generated/prisma/client"
import { canWrite, type Area } from "./permissions"
import { fieldErrors, type FieldErrors } from "./validations"

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors }

/**
 * Executa uma Server Action com todas as checagens, nesta ordem:
 * 1. sessão válida e igreja ativa (Clerk);
 * 2. usuário ativo e com permissão de escrita na área (`null` = só admin);
 * 3. entrada validada pelo esquema Zod.
 * A função recebe os dados já validados e a sessão, e deve filtrar toda consulta por `session.church.id`.
 * Erros inesperados são registrados no servidor e chegam ao usuário só como mensagem genérica.
 */
export async function secureAction<S extends z.ZodType, T>(
  area: Area | null,
  schema: S,
  input: unknown,
  fn: (data: z.output<S>, session: Session) => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const session = await getSession()
    const permitido = area ? canWrite(session.user.papel, area) : session.user.papel === "admin"
    if (!permitido) return { ok: false, error: "Sua função não permite fazer isso." }

    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      const errors = fieldErrors(parsed.error)
      return { ok: false, error: Object.values(errors)[0] ?? "Dados inválidos.", fieldErrors: errors }
    }

    return { ok: true, data: await fn(parsed.data, session) }
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")
      return { ok: false, error: "Registro não encontrado. Recarregue a página." }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { ok: false, error: "Já existe um registro com esses dados." }
    console.error("[secureAction]", e)
    return { ok: false, error: "Não foi possível concluir. Tente de novo." }
  }
}
