"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import { Award, Download, LogOut, PenLine, Printer, RotateCcw, Share } from "lucide-react"
import { toast } from "sonner"

import { Certificate } from "@/components/app/certificate"
import { MemberCardBack, MemberCardFront } from "@/components/app/member-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useFormAction } from "@/hooks/use-form-action"
import { requestCorrection } from "@/lib/actions/portal-member"
import { formatDate } from "@/lib/format"
import type { Church, Endereco, IssuedCertificate, Member } from "@/lib/types"
import { correctionSchema } from "@/lib/validations"

// Partes do portal do membro que precisam do navegador: sair, instalar, virar a carteirinha, imprimir certificados
// e pedir correção dos dados.

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

type PedidoInstalacao = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

const nada = () => () => {}
/** iPhone/iPad no navegador (não instalado): o Safari não tem pedido de instalação, só o menu Compartilhar. */
const iphoneSemApp = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches

/** Convida a instalar o portal na tela inicial. Some quando já está instalado ou o navegador não permite. */
export function InstalarApp() {
  const [pedido, setPedido] = React.useState<PedidoInstalacao | null>(null)
  const iphone = React.useSyncExternalStore(nada, iphoneSemApp, () => false)

  React.useEffect(() => {
    const guardar = (e: Event) => {
      e.preventDefault()
      setPedido(e as PedidoInstalacao)
    }
    const instalado = () => setPedido(null)
    window.addEventListener("beforeinstallprompt", guardar)
    window.addEventListener("appinstalled", instalado)
    return () => {
      window.removeEventListener("beforeinstallprompt", guardar)
      window.removeEventListener("appinstalled", instalado)
    }
  }, [])

  if (pedido)
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-background p-3 text-sm">
        <Download className="size-5 shrink-0 text-primary" />
        <p className="flex-1">Coloque o portal na tela inicial do celular, como um aplicativo.</p>
        <Button
          size="sm"
          onClick={async () => {
            await pedido.prompt()
            await pedido.userChoice
            setPedido(null)
          }}
        >
          Instalar
        </Button>
      </div>
    )
  if (iphone)
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-background p-3 text-sm">
        <Share className="size-5 shrink-0 text-primary" />
        <p>Para ter o portal na tela inicial: toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</p>
      </div>
    )
  return null
}

const CAMPOS_ENDERECO: { k: keyof Endereco; label: string; className?: string }[] = [
  { k: "rua", label: "Rua", className: "col-span-2" },
  { k: "numero", label: "Número" },
  { k: "cep", label: "CEP" },
  { k: "bairro", label: "Bairro", className: "col-span-2" },
  { k: "cidade", label: "Cidade" },
  { k: "uf", label: "UF" },
]

/** O membro pede para corrigir contato e endereço (ou descreve outra correção); a secretaria aprova ou recusa. */
export function PedirCorrecao({ m, igrejaId, pendente }: { m: Member; igrejaId?: string; pendente?: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const { errors, pending, submit, invalid } = useFormAction()
  const inicial = () => ({ membroId: m.id, telefone: m.telefone, email: m.email, endereco: { ...m.endereco }, observacao: "", igrejaId })
  const [d, setD] = React.useState(inicial)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit(correctionSchema, d, () => requestCorrection(d), (r) => {
      if (!r.enviado) return toast.info("Nada mudou. Altere algum dado ou descreva a correção.")
      toast.success("Pedido enviado. A secretaria vai conferir e atualizar o seu cadastro.")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-xs text-muted-foreground">
          {pendente ? `Pedido de correção enviado em ${formatDate(pendente.slice(0, 10))}, esperando a secretaria.` : "Algum dado errado ou desatualizado?"}
        </p>
        <Button size="sm" variant="outline" onClick={() => { setD(inicial()); setOpen(true) }}>
          <PenLine /> {pendente ? "Mudar o pedido" : "Pedir correção"}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedir correção</DialogTitle>
            <DialogDescription>Altere o que estiver errado. A secretaria confere antes de mudar o seu cadastro.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup className="grid grid-cols-2 gap-3">
              <Field className="col-span-2">
                <FieldLabel htmlFor="c-tel">Telefone</FieldLabel>
                <Input {...invalid("telefone")} id="c-tel" inputMode="tel" value={d.telefone} onChange={(e) => setD({ ...d, telefone: e.target.value })} />
                <FieldError>{errors.telefone}</FieldError>
              </Field>
              <Field className="col-span-2">
                <FieldLabel htmlFor="c-email">E-mail</FieldLabel>
                <Input {...invalid("email")} id="c-email" type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} />
                <FieldError>{errors.email}</FieldError>
              </Field>
              {CAMPOS_ENDERECO.map(({ k, label, className }) => (
                <Field key={k} className={className}>
                  <FieldLabel htmlFor={`c-${k}`}>{label}</FieldLabel>
                  <Input
                    {...invalid(`endereco.${k}`)}
                    id={`c-${k}`}
                    value={d.endereco[k]}
                    onChange={(e) => setD({ ...d, endereco: { ...d.endereco, [k]: k === "uf" ? e.target.value.toUpperCase() : e.target.value } })}
                  />
                  <FieldError>{errors[`endereco.${k}`]}</FieldError>
                </Field>
              ))}
              <Field className="col-span-2">
                <FieldLabel htmlFor="c-obs">Outra correção</FieldLabel>
                <Textarea
                  {...invalid("observacao")}
                  id="c-obs"
                  rows={3}
                  placeholder="Ex.: minha data de batismo está errada, foi em 12/03/2015."
                  value={d.observacao}
                  onChange={(e) => setD({ ...d, observacao: e.target.value })}
                />
                <FieldError>{errors.observacao}</FieldError>
              </Field>
            </FieldGroup>
            <p className="mt-3 text-xs text-muted-foreground">Se mudar o e-mail, o novo passa a ser o do seu login no portal quando a secretaria aprovar.</p>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar pedido"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
