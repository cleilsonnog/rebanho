"use client"

import * as React from "react"
import type { z } from "zod"
import { toast } from "sonner"

import type { ActionResult } from "@/lib/action"
import { check, type FieldErrors } from "@/lib/validations"

/** Mostra o erro de uma ação sem formulário (ex.: excluir). Devolve se deu certo. */
export async function notify<T>(p: Promise<ActionResult<T>>, sucesso?: string) {
  const r = await p
  if (r.ok) {
    if (sucesso) toast.success(sucesso)
  } else toast.error(r.error)
  return r.ok
}

/**
 * Envio de formulário: valida com o esquema Zod no navegador (resposta imediata no campo),
 * chama a Server Action (que valida de novo e checa permissão) e mostra os erros que ela devolver.
 */
export function useFormAction() {
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [pending, setPending] = React.useState(false)

  async function submit<S extends z.ZodType, T>(
    schema: S,
    value: z.input<S>,
    action: () => Promise<ActionResult<T>>,
    onOk: (data: T) => void
  ) {
    const local = check(schema, value)
    if (local) {
      setErrors(local)
      toast.error(Object.values(local)[0])
      return
    }
    setPending(true)
    try {
      const r = await action()
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {})
        toast.error(r.error)
        return
      }
      setErrors({})
      onOk(r.data)
    } catch {
      toast.error("Sem conexão com o servidor. Tente de novo.")
    } finally {
      setPending(false)
    }
  }

  /** Props para marcar o campo como inválido (borda vermelha + leitor de tela). */
  const invalid = (name: string) => (errors[name] ? { "aria-invalid": true as const } : {})

  return { errors, pending, submit, invalid }
}
