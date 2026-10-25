"use client"

import * as React from "react"
import { BookOpen, ChevronDown } from "lucide-react"

import { periodoDaSemana } from "@/lib/format"
import type { CellStudy } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Estudo da semana: tema e referência sempre visíveis; o texto abre e fecha. */
export function CellStudyCard({ study, defaultOpen = false, className }: { study: CellStudy; defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className={cn("rounded-xl border border-primary/25 bg-primary/5 p-4", className)}>
      <button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <BookOpen className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground">Estudo da semana · {periodoDaSemana(study.semana)}</span>
          <span className="block font-medium">{study.tema}</span>
          {study.referencia && <span className="block text-sm text-muted-foreground">{study.referencia}</span>}
        </span>
        <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <p className="mt-3 border-t border-primary/15 pt-3 text-sm whitespace-pre-wrap">{study.texto}</p>}
    </div>
  )
}
