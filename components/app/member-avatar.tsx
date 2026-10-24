import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { STATUS_CLASS, STATUS_LABEL, initials } from "@/lib/format"
import type { MemberStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const TONES = [
  "bg-primary/15 text-primary",
  "bg-highlight/25 text-highlight-foreground dark:text-highlight",
  "bg-success/15 text-success",
  "bg-chart-4/15 text-chart-4",
  "bg-chart-3/15 text-chart-3",
]

export function MemberAvatar({ nome, className }: { nome: string; className?: string }) {
  let hash = 0
  for (const c of nome) hash = (hash * 31 + c.charCodeAt(0)) >>> 0
  return (
    <Avatar className={className}>
      <AvatarFallback className={cn("font-medium", TONES[hash % TONES.length])}>{initials(nome)}</AvatarFallback>
    </Avatar>
  )
}

export function StatusBadge({ status }: { status: MemberStatus }) {
  return <Badge className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</Badge>
}
