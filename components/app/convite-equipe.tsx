"use client"

import { Copy, MessageCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ROLE_LABEL, whatsappLink } from "@/lib/format"
import { useApp } from "@/lib/store"
import type { AppUser } from "@/lib/types"

/**
 * Convite da equipe pronto para mandar: a pessoa entra no Rebanho com o e-mail do convite e o acesso é ligado
 * sozinho. Depois do login ela cai na escolha de igreja, onde aparece a igreja nova (se já for de outra).
 */
export function textoDoConvite(u: AppUser, igreja: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin
  const link = `${origin}/entrar?redirect_url=${encodeURIComponent(`${origin}/igreja`)}`
  return `Olá, ${u.nome.split(" ")[0]}! Você foi convidado(a) para a equipe da ${igreja} no Rebanho, como ${ROLE_LABEL[u.papel]}. Entre em ${link} com o e-mail ${u.email} (pode ser com a conta Google, se for esse e-mail).`
}

export function ConviteEquipe({ u, onClose }: { u?: AppUser; onClose: () => void }) {
  const igreja = useApp((s) => s.church.nome)
  const telefone = useApp((s) => s.members.find((m) => m.id === u?.memberId)?.telefone)
  const texto = u ? textoDoConvite(u, igreja) : ""
  return (
    <Dialog open={!!u} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convite para {u?.nome}</DialogTitle>
          <DialogDescription>Mande este convite pelo WhatsApp ou copie e envie como preferir.</DialogDescription>
        </DialogHeader>
        <p className="rounded-lg bg-muted/60 p-3 text-sm break-words">{texto}</p>
        <p className="text-xs text-muted-foreground">
          O acesso só vale entrando com o e-mail {u?.email}. Se a pessoa usar outro e-mail, remova o convite e convide de novo.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(texto).then(() => toast.success("Convite copiado"))}>
            <Copy /> Copiar
          </Button>
          <Button asChild>
            <a href={telefone ? whatsappLink(telefone, texto) : `https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer">
              <MessageCircle /> Enviar no WhatsApp
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
