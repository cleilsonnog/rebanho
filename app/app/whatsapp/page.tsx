"use client"

import * as React from "react"
import { CheckCircle2, Loader2, MessageCircle, QrCode, Smartphone, Unplug } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useApp } from "@/lib/store"

export default function WhatsAppPage() {
  const whatsapp = useApp((s) => s.whatsapp)
  const church = useApp((s) => s.church)
  const update = useApp((s) => s.updateWhatsApp)
  const [conectando, setConectando] = React.useState(false)
  const [mensagem, setMensagem] = React.useState(whatsapp.mensagemAniversario)

  function conectar() {
    setConectando(true)
    // Demonstração: simula a leitura do QR Code. Em produção, use um provedor de API do WhatsApp.
    setTimeout(() => {
      update({ conectado: true, numero: church.telefone })
      setConectando(false)
      toast.success("WhatsApp conectado")
    }, 2500)
  }

  const exemplo = mensagem.replace("{nome}", "Rebeca").replace("{igreja}", church.nome)

  return (
    <>
      <PageHeader title="WhatsApp" description="Conecte o número da igreja para enviar parabéns e avisos automaticamente." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Conexão
              {whatsapp.conectado ? <Badge className="bg-success/15 text-success">Conectado</Badge> : <Badge variant="secondary">Desconectado</Badge>}
            </CardTitle>
            <CardDescription>
              {whatsapp.conectado ? `Enviando pelo número ${whatsapp.numero}` : "Abra o WhatsApp no celular da igreja › Aparelhos conectados › Conectar aparelho."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {whatsapp.conectado ? (
              <>
                <CheckCircle2 className="size-24 text-success" />
                <Button variant="outline" onClick={() => update({ conectado: false, numero: undefined })}><Unplug /> Desconectar</Button>
              </>
            ) : (
              <>
                <div className="relative rounded-2xl border bg-white p-4">
                  <QRCodeSVG value={`rebanho-whatsapp-pairing:${church.sigla}`} size={180} className={conectando ? "opacity-30" : ""} />
                  {conectando && <Loader2 className="absolute inset-0 m-auto size-10 animate-spin text-primary" />}
                </div>
                <div className="flex gap-2">
                  <Button onClick={conectar} disabled={conectando}><QrCode /> {conectando ? "Aguardando leitura…" : "Já escaneei"}</Button>
                  <Button variant="outline" onClick={conectar} disabled={conectando}><Smartphone /> Usar código</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aniversários automáticos</CardTitle>
            <CardDescription>Use {"{nome}"} e {"{igreja}"} para personalizar.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field orientation="horizontal" className="justify-between">
                <div>
                  <FieldLabel htmlFor="auto">Envio automático</FieldLabel>
                  <FieldDescription>Envia às 8h do dia do aniversário.</FieldDescription>
                </div>
                <Switch id="auto" checked={whatsapp.envioAutomatico} onCheckedChange={(v) => update({ envioAutomatico: v })} />
              </Field>
              <Field>
                <FieldLabel>Avisar a liderança com antecedência de</FieldLabel>
                <Select value={String(whatsapp.diasAntecedencia)} onValueChange={(v) => update({ diasAntecedencia: Number(v) })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 7].map((d) => <SelectItem key={d} value={String(d)}>{d} dia(s)</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="msg">Mensagem</FieldLabel>
                <Textarea id="msg" rows={4} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
              </Field>
              <div className="rounded-xl bg-[#e7f8e0] p-3 text-sm text-neutral-800 dark:bg-[#1f3a1a] dark:text-neutral-100">
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-[#1c7d32] dark:text-[#7fd68d]"><MessageCircle className="size-3.5" /> Pré-visualização</p>
                {exemplo}
              </div>
              <Button onClick={() => { update({ mensagemAniversario: mensagem }); toast.success("Mensagem salva") }}>Salvar mensagem</Button>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Envio em massa</CardTitle><CardDescription>Avisos para um grupo de membros (ex.: lembrete de evento).</CardDescription></CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end"
              onSubmit={(e) => {
                e.preventDefault()
                if (!whatsapp.conectado) return toast.error("Conecte o WhatsApp primeiro")
                toast.success("Mensagens colocadas na fila de envio")
                e.currentTarget.reset()
              }}
            >
              <Field>
                <FieldLabel>Destinatários</FieldLabel>
                <Select defaultValue="ativos">
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativos">Membros ativos</SelectItem>
                    <SelectItem value="lideres">Líderes e obreiros</SelectItem>
                    <SelectItem value="visitantes">Visitantes</SelectItem>
                    <SelectItem value="jovens">Ministério de jovens</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="aviso">Mensagem</FieldLabel>
                <Input id="aviso" required placeholder="Ex.: Lembrete: Congresso de Jovens neste sábado às 18h!" />
              </Field>
              <Button type="submit">Enviar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
