import "server-only"

import type { z } from "zod"

import { gravarHistorico } from "./audit"
import { ActionError, getSession, type Session } from "./church"
import { Prisma } from "./generated/prisma/client"
import { canWrite, type Area } from "./permissions"
import { limitar } from "./rate-limit"
import { fieldErrors, type FieldErrors } from "./validations"

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors }

/**
 * Executa uma Server Action com todas as checagens, nesta ordem:
 * 1. sessão válida e igreja ativa (Clerk);
 * 2. rate limit por usuário (lib/rate-limit.ts);
 * 3. usuário ativo e com permissão de escrita na área (`null` = só admin);
 * 4. entrada validada pelo esquema Zod.
 * A função recebe os dados já validados e a sessão, e deve filtrar toda consulta por `session.church.id`.
 * Toda ação que altera dados chama `registrar("Excluiu o membro Fulano")`: o texto vai para o histórico
 * (lib/audit.ts) só se a ação terminar sem erro.
 * Erros inesperados são registrados no servidor e chegam ao usuário só como mensagem genérica.
 */
export async function secureAction<S extends z.ZodType, T>(
  area: Area | null,
  schema: S,
  input: unknown,
  fn: (data: z.output<S>, session: Session, registrar: (descricao: string) => void) => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const session = await getSession()
    await limitar("escrita", session.user.id)
    const permitido = area ? canWrite(session.user.papel, area) : session.user.papel === "admin"
    if (!permitido) return { ok: false, error: "Sua função não permite fazer isso." }

    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      const errors = fieldErrors(parsed.error)
      return { ok: false, error: Object.values(errors)[0] ?? "Dados inválidos.", fieldErrors: errors }
    }

    const historico: string[] = []
    const data = await fn(parsed.data, session, (d) => historico.push(d))
    await gravarHistorico(session, area, historico)
    return { ok: true, data }
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
