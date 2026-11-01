"use client"

import * as React from "react"
import { ChevronRight, Church } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { criarIgreja, escolherIgreja } from "@/lib/actions/igreja"

/** Botão que abre uma das igrejas da conta no painel. */
export function AbrirIgreja({ id, nome, detalhe, desativado }: { id: string; nome: string; detalhe: string; desativado?: boolean }) {
  const [pendente, iniciar] = React.useTransition()
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await escolherIgreja(id)
          if (r?.error) toast.error(r.error)
        })
      }
      className="flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left hover:border-primary/50 disabled:opacity-60"
    >
      <Church className="size-5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{nome}</span>
        <span className="block text-xs text-muted-foreground">{desativado ? "Acesso desativado pelo administrador" : detalhe}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  )
}

/** Cadastro de igreja nova: quem cadastra vira o administrador. */
export function CriarIgreja() {
  const [estado, enviar, pendente] = React.useActionState(criarIgreja, undefined)
  return (
    <form action={enviar} className="space-y-3">
      <Field>
        <FieldLabel htmlFor="nova-igreja">Nome da igreja</FieldLabel>
        <Input id="nova-igreja" name="nome" placeholder="Ex.: Igreja Batista Esperança" aria-invalid={estado?.error ? true : undefined} required />
        <FieldError>{estado?.error}</FieldError>
      </Field>
      <Button type="submit" className="w-full" disabled={pendente}>{pendente ? "Cadastrando…" : "Cadastrar e começar"}</Button>
    </form>
  )
}
