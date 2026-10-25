"use client"

import * as React from "react"
import { BookOpen, ChevronDown, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { periodoDaSemana } from "@/lib/format"
import { useApp } from "@/lib/store"
import type { CellStudy } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Folha do estudo para imprimir ou salvar em PDF: sempre preto no branco, mesmo no tema escuro. */
function StudySheet({ study, celula }: { study: CellStudy; celula?: string }) {
  const igreja = useApp((s) => s.church.nome)
  return (
    <article className="bg-white p-10 font-sans text-black">
      <header className="border-b-2 border-black pb-3">
        <p className="text-sm">{igreja}</p>
        <p className="text-sm">
          Estudo da semana · {periodoDaSemana(study.semana)}
          {celula && ` · Célula ${celula}`}
        </p>
      </header>
      <h1 className="mt-6 text-3xl font-bold">{study.tema}</h1>
      {study.referencia && <p className="mt-1 text-lg">{study.referencia}</p>}
      <div className="mt-6 text-base leading-relaxed whitespace-pre-wrap">{study.texto}</div>
      <section className="mt-10 break-inside-avoid">
        <p className="font-semibold">Anotações</p>
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-8 border-b border-gray-400" />)}
      </section>
    </article>
  )
}

/**
 * Abre a impressão do navegador só com o estudo (lá dá para escolher "Salvar como PDF").
 * A folha só entra na página na hora de imprimir, para não sair junto com outro estudo da mesma tela.
 */
export function PrintStudyButton({ study, celula, iconOnly }: { study: CellStudy; celula?: string; iconOnly?: boolean }) {
  const [printing, setPrinting] = React.useState(false)

  React.useEffect(() => {
    if (!printing) return
    const fim = () => setPrinting(false)
    window.addEventListener("afterprint", fim)
    const t = setTimeout(() => window.print(), 100)
    return () => {
      clearTimeout(t)
      window.removeEventListener("afterprint", fim)
    }
  }, [printing])

  return (
    <>
      <Button
        type="button"
        variant={iconOnly ? "ghost" : "outline"}
        size={iconOnly ? "icon-sm" : "sm"}
        aria-label="Imprimir ou salvar em PDF"
        title="Imprimir ou salvar em PDF"
        onClick={() => setPrinting(true)}
      >
        <Printer />
        {!iconOnly && "Imprimir / PDF"}
      </Button>
      {printing && (
        <div className="print-area hidden print:block">
          <StudySheet study={study} celula={celula} />
        </div>
      )}
    </>
  )
}

/** Estudo da semana: tema e referência sempre visíveis; o texto abre e fecha. */
export function CellStudyCard({
  study,
  celula,
  defaultOpen = false,
  className,
}: {
  study: CellStudy
  celula?: string
  defaultOpen?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className={cn("rounded-xl border border-primary/25 bg-primary/5 p-4", className)}>
      <div className="flex items-start gap-2">
        <button type="button" className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
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
        <PrintStudyButton study={study} celula={celula} />
      </div>
      {open && <p className="mt-3 border-t border-primary/15 pt-3 text-sm whitespace-pre-wrap">{study.texto}</p>}
    </div>
  )
}
