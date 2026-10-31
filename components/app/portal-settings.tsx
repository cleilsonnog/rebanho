"use client"

import * as React from "react"
import { KeyRound } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { notify } from "@/hooks/use-form-action"
import { useApp } from "@/lib/store"

const OPCOES = [
  {
    chave: "aniversariantes" as const,
    titulo: "Aniversariantes do mês",
    texto: "Nome e dia do aniversário dos membros ativos que fazem aniversário no mês (sem idade nem ano).",
  },
  {
    chave: "colegasCelula" as const,
    titulo: "Colegas de célula",
    texto: "Nomes de quem participa da mesma célula (sem telefone nem endereço).",
  },
]

/** O que o portal do membro mostra além da própria pessoa. Tudo desligado por padrão: a igreja escolhe. */
export function PortalSettings() {
  const portal = useApp((s) => s.church.portal)
  const updatePortalSettings = useApp((s) => s.updatePortalSettings)
  const [salvando, setSalvando] = React.useState(false)

  async function mudar(chave: keyof typeof portal, valor: boolean) {
    setSalvando(true)
    await notify(updatePortalSettings({ ...portal, [chave]: valor }), "Portal atualizado")
    setSalvando(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="size-5 text-primary" /> Portal do membro</CardTitle>
        <CardDescription>
          Cada membro sempre vê os próprios dados, a carteirinha, a célula, as escolas e a agenda. Escolha o que mais ele
          pode ver sobre outras pessoas. Dízimos, ofertas e contatos de outras pessoas nunca aparecem.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {OPCOES.map((o) => (
          <label key={o.chave} className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <span>
              <span className="block font-medium">{o.titulo}</span>
              <span className="block text-sm text-muted-foreground">{o.texto}</span>
            </span>
            <Switch checked={portal[o.chave]} disabled={salvando} onCheckedChange={(v) => mudar(o.chave, v)} aria-label={o.titulo} />
          </label>
        ))}
        <p className="text-sm text-muted-foreground">
          Para liberar o acesso, abra a ficha do membro (bloco &quot;Portal do membro&quot;) ou use &quot;Liberar portal&quot; na lista de membros.
        </p>
      </CardContent>
    </Card>
  )
}
