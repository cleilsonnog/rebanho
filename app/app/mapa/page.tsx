"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/format"
import { useApp } from "@/lib/store"
import type { MemberStatus } from "@/lib/types"

const MembersMap = dynamic(() => import("@/components/app/members-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>
  ),
})

function MapaContent() {
  const params = useSearchParams()
  const members = useApp((s) => s.members)
  const [visible, setVisible] = React.useState<MemberStatus[]>(["ativo", "afastado", "visitante"])
  const filtered = members.filter((m) => visible.includes(m.status))
  const focus = members.find((m) => m.id === params.get("membro"))

  const porBairro = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const m of filtered) map.set(m.endereco.bairro, (map.get(m.endereco.bairro) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [filtered])

  return (
    <>
      <PageHeader title="Mapa de membros" description="Aproxime para ver quem mora perto e planeje visitas e células por região." />
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card className="h-[560px] overflow-hidden p-0 lg:h-[680px]">
          <MembersMap members={filtered} focus={focus} />
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Mostrar</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(Object.keys(STATUS_LABEL) as MemberStatus[]).map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={visible.includes(s)}
                    onCheckedChange={(c) => setVisible((v) => (c ? [...v, s] : v.filter((x) => x !== s)))}
                  />
                  <span className="size-3 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                  <span className="flex-1">{STATUS_LABEL[s]}</span>
                  <span className="text-muted-foreground">{members.filter((m) => m.status === s).length}</span>
                </label>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Por bairro</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {porBairro.map(([b, n]) => (
                <div key={b} className="flex justify-between text-sm"><span>{b}</span><span className="text-muted-foreground">{n}</span></div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

export default function MapaPage() {
  return (
    <React.Suspense>
      <MapaContent />
    </React.Suspense>
  )
}
