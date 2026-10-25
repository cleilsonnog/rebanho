"use client"

import * as React from "react"
import { Check, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { MemberAvatar } from "@/components/app/member-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useApp } from "@/lib/store"

/** Escolhe várias pessoas (ex.: o casal de líderes). `hint` mostra uma observação ao lado do nome. */
export function MembersMultiPicker({
  value,
  onChange,
  max,
  exclude = [],
  hint,
  addLabel = "Adicionar",
}: {
  value: string[]
  onChange: (ids: string[]) => void
  max?: number
  exclude?: string[]
  hint?: (id: string) => string | undefined
  addLabel?: string
}) {
  const members = useApp((s) => s.members)
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState("")
  const byId = React.useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const fora = new Set(exclude)
  const list = members
    .filter((m) => m.status !== "transferido" && !fora.has(m.id) && m.nome.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, 40)
  const cheio = max !== undefined && value.length >= max

  function toggle(id: string) {
    if (value.includes(id)) return onChange(value.filter((x) => x !== id))
    if (cheio) return toast.error(`Escolha no máximo ${max}.`)
    onChange([...value, id])
    if (max !== undefined && value.length + 1 >= max) setOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((id) => {
        const m = byId.get(id)
        if (!m) return null
        return (
          <span key={id} className="flex items-center gap-1.5 rounded-full border bg-muted/40 py-0.5 pr-1 pl-0.5 text-sm">
            <MemberAvatar nome={m.nome} className="size-6 text-[10px]" />
            <span className="max-w-48 truncate">{m.nome}</span>
            <button type="button" aria-label={`Tirar ${m.nome}`} onClick={() => toggle(id)} className="rounded-full p-0.5 hover:bg-muted">
              <X className="size-3.5" />
            </button>
          </span>
        )
      })}
      {!cheio && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="rounded-full"><Plus /> {addLabel}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2" align="start">
            <Input autoFocus placeholder="Buscar nome…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="mt-2 max-h-64 overflow-y-auto">
              {list.map((m) => {
                const obs = hint?.(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <MemberAvatar nome={m.nome} className="size-6 text-[10px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{m.nome}</span>
                      <span className="block truncate text-xs text-muted-foreground">{obs ?? m.endereco.bairro}</span>
                    </span>
                    {value.includes(m.id) && <Check className="size-4 text-primary" />}
                  </button>
                )
              })}
              {list.length === 0 && <p className="p-2 text-sm text-muted-foreground">Ninguém encontrado.</p>}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
