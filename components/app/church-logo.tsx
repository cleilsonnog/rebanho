"use client"

import { useApp } from "@/lib/store"
import type { Church } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Logo da igreja (guardada no Clerk), ou `fallback` se não houver. `<img>` comum de propósito: carrega na hora,
 * inclusive na impressão, onde o carregamento preguiçoso do next/image deixaria a logo de fora.
 */
export function LogoImg({
  church,
  className,
  fallback = null,
}: {
  church: Pick<Church, "nome" | "logoUrl">
  className?: string
  fallback?: React.ReactNode
}) {
  if (!church.logoUrl) return fallback
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={church.logoUrl} alt={`Logo da ${church.nome}`} className={cn("object-contain", className)} />
}

/** A mesma logo, lendo a igreja ativa do painel. */
export function ChurchLogo(props: { className?: string; fallback?: React.ReactNode }) {
  const church = useApp((s) => s.church)
  return <LogoImg church={church} {...props} />
}
