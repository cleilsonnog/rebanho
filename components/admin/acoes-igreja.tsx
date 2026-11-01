"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Ban, LockOpen, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { apagarIgreja, bloquearIgreja, desbloquearIgreja } from "@/lib/actions/plataforma"
import type { ActionResult } from "@/lib/action"

/** Bloquear, desbloquear e apagar uma igreja no painel do dono da plataforma. */
export function AcoesIgreja({ id, nome, bloqueada }: { id: string; nome: string; bloqueada: boolean }) {
  const router = useRouter()
  const [dialogo, setDialogo] = React.useState<"bloquear" | "apagar" | null>(null)
  const [texto, setTexto] = React.useState("")
  const [pendente, iniciar] = React.useTransition()

  const rodar = (p: () => Promise<ActionResult>, sucesso: string) =>
    iniciar(async () => {
      const r = await p()
      if (!r.ok) return void toast.error(r.error)
      toast.success(sucesso)
      setDialogo(null)
      setTexto("")
      router.refresh()
    })

  return (
    <div className="flex justify-end gap-1">
      {bloqueada ? (
        <Button size="sm" variant="outline" disabled={pendente} onClick={() => rodar(() => desbloquearIgreja(id), "Igreja desbloqueada")}>
          <LockOpen /> Desbloquear
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setDialogo("bloquear")}><Ban /> Bloquear</Button>
      )}
      <Button size="icon-sm" variant="ghost" aria-label={`Apagar ${nome}`} onClick={() => setDialogo("apagar")}><Trash2 /></Button>

      <Dialog open={dialogo !== null} onOpenChange={(o) => !o && (setDialogo(null), setTexto(""))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogo === "bloquear" ? `Bloquear ${nome}` : `Apagar ${nome}`}</DialogTitle>
            <DialogDescription>
              {dialogo === "bloquear"
                ? "Ninguém da equipe nem do portal do membro entra enquanto estiver bloqueada. Os dados ficam guardados e dá para desbloquear depois."
                : "Apaga a igreja e TODOS os dados dela (membros, células, financeiro, histórico). Não tem volta."}
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="admin-texto">{dialogo === "bloquear" ? "Motivo" : `Digite "${nome}" para confirmar`}</FieldLabel>
            <Input id="admin-texto" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={dialogo === "bloquear" ? "Ex.: cadastro duplicado de outra igreja" : nome} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogo(null)}>Cancelar</Button>
            {dialogo === "bloquear" ? (
              <Button disabled={pendente} onClick={() => rodar(() => bloquearIgreja({ churchId: id, motivo: texto }), "Igreja bloqueada")}>Bloquear</Button>
            ) : (
              <Button variant="destructive" disabled={pendente || texto !== nome} onClick={() => rodar(() => apagarIgreja({ churchId: id, confirmacao: texto }), "Igreja apagada")}>
                Apagar para sempre
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
