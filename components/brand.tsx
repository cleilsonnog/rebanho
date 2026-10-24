import Link from "next/link"

import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      {/* cajado estilizado */}
      <path
        d="M13 25V12.5a5 5 0 1 1 10 0c0 2.2-1.6 3.6-3.5 3.6"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        className="stroke-primary-foreground"
      />
      <circle cx="21.5" cy="23" r="2.4" className="fill-highlight" />
    </svg>
  )
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-heading text-xl font-semibold", className)}>
      <LogoMark />
      <span>Rebanho</span>
    </Link>
  )
}
