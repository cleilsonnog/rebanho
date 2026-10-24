"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { MemberAvatar } from "@/components/app/member-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useApp } from "@/lib/store"
import { cn } from "@/lib/utils"

export function MemberPicker({
  value,
  onChange,
  placeholder = "Selecione uma pessoa",
}: {
  value?: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const members = useApp((s) => s.members)
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState("")
  const selected = members.find((m) => m.id === value)
  const list = members
    .filter((m) => m.nome.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, 40)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between font-normal">
          <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected?.nome ?? placeholder}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-2" align="start">
        <Input autoFocus placeholder="Buscar nome…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="mt-2 max-h-64 overflow-y-auto">
          {list.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onChange(m.id)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              <MemberAvatar nome={m.nome} className="size-6 text-[10px]" />
              <span className="flex-1 truncate">{m.nome}</span>
              {m.id === value && <Check className="size-4 text-primary" />}
            </button>
          ))}
          {list.length === 0 && <p className="p-2 text-sm text-muted-foreground">Ninguém encontrado.</p>}
        </div>
      </PopoverContent>
    </Popover>
  )
}
