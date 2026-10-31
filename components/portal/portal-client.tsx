"use client"

import * as React from "react"
import { useClerk } from "@clerk/nextjs"
import { Award, LogOut, Printer, RotateCcw } from "lucide-react"

import { Certificate } from "@/components/app/certificate"
import { MemberCardBack, MemberCardFront } from "@/components/app/member-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDate } from "@/lib/format"
import type { Church, IssuedCertificate, Member } from "@/lib/types"

// Partes do portal do membro que precisam do navegador: sair, virar a carteirinha e imprimir certificados.

export function SairButton({ className }: { className?: string }) {
  const { signOut } = useClerk()
  return (
    <Button variant="ghost" size="sm" className={className} onClick={() => signOut({ redirectUrl: "/membro/entrar" })}>
      <LogOut /> Sair
    </Button>
  )
}

/** Carteirinha com frente e verso (o QR Code abre a página pública de verificação). */
export function Carteirinha({ m, church, url, validade }: { m: Member; church: Church; url: string; validade: string }) {
  const [verso, setVerso] = React.useState(false)
  return (
    <div className="flex flex-col items-center gap-3">
      {verso ? <MemberCardBack m={m} church={church} url={url} /> : <MemberCardFront m={m} church={church} validade={validade} />}
      <Button variant="outline" size="sm" onClick={() => setVerso((v) => !v)}>
        <RotateCcw /> {verso ? "Ver a frente" : "Ver o verso (QR Code)"}
      </Button>
    </div>
  )
}

/** Certificados já emitidos pela igreja, para ver e imprimir. */
export function Certificados({ m, church, certificados }: { m: Member; church: Church; certificados: IssuedCertificate[] }) {
  const [aberto, setAberto] = React.useState<IssuedCertificate | null>(null)
  if (certificados.length === 0) return <p className="text-sm text-muted-foreground">Nenhum certificado emitido ainda.</p>
  return (
    <>
      <div className="space-y-2">
        {certificados.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setAberto(c)}
            className="flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm hover:border-primary/50"
          >
            <Award className="size-5 shrink-0 text-primary" />
            <span className="flex-1">
              <span className="block font-medium">{c.tipo}</span>
              {c.detalhe && <span className="block text-xs text-muted-foreground">{c.detalhe}</span>}
            </span>
            <span className="text-xs text-muted-foreground">{formatDate(c.emitidoEm)}</span>
          </button>
        ))}
      </div>
      <Dialog open={!!aberto} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Certificado de {aberto?.tipo}</DialogTitle></DialogHeader>
          {aberto && (
            <div className="print-area">
              <Certificate m={m} church={church} tipo={aberto.tipo} detalhe={aberto.detalhe} data={aberto.emitidoEm} estilo={aberto.estilo} />
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => window.print()}><Printer /> Imprimir ou salvar em PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
