import { BadgeCheck } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

import { LogoMark } from "@/components/brand"
import { MemberAvatar } from "@/components/app/member-avatar"
import { STATUS_LABEL, formatDate } from "@/lib/format"
import type { Church, Member } from "@/lib/types"

export function MemberCardFront({ m, church, validade }: { m: Member; church: Church; validade: string }) {
  const ativo = m.status === "ativo"
  return (
    <div className="relative aspect-[1.586] w-full max-w-[400px] overflow-hidden rounded-2xl bg-linear-to-br from-[#5b2fc4] to-[#3a1d86] p-5 text-white shadow-lg">
      <div className="absolute -top-16 -right-16 size-48 rounded-full bg-white/10" />
      <div className="relative flex items-center gap-2">
        <LogoMark className="size-7" />
        <p className="truncate text-sm font-semibold">{church.nome}</p>
      </div>
      <div className="relative mt-4 flex items-center gap-4">
        <MemberAvatar nome={m.nome} className="size-16 text-lg ring-2 ring-white/70 [&_[data-slot=avatar-fallback]]:bg-white/90 [&_[data-slot=avatar-fallback]]:text-[#3a1d86]" />
        <div className="min-w-0">
          <p className="text-[10px] tracking-widest uppercase opacity-70">Carteira de membro</p>
          <p className="truncate font-heading text-lg leading-tight font-semibold">{m.nome}</p>
          <p className="text-xs opacity-80">{m.cargo} · {m.congregacao}</p>
        </div>
      </div>
      <div className="relative mt-4 flex items-end justify-between">
        <div className="text-[11px] leading-relaxed opacity-90">
          <p>Membro desde {formatDate(m.membroDesde)}</p>
          {m.batizado && <p>Batismo {formatDate(m.dataBatismo)}</p>}
          <p className={`mt-1 flex items-center gap-1 font-semibold ${ativo ? "text-[#ffd27a]" : "text-white/70"}`}>
            <BadgeCheck className="size-3.5" /> {STATUS_LABEL[m.status]} · válida até {validade}
          </p>
        </div>
        <span className="font-mono text-[10px] opacity-60">#{m.id.toUpperCase()}</span>
      </div>
    </div>
  )
}

export function MemberCardBack({ m, church, url }: { m: Member; church: Church; url: string }) {
  return (
    <div className="flex aspect-[1.586] w-full max-w-[400px] items-center gap-4 overflow-hidden rounded-2xl border bg-white p-5 text-neutral-900 shadow-lg">
      <div className="rounded-lg bg-white p-1.5 ring-1 ring-neutral-200">
        <QRCodeSVG value={url} size={112} fgColor="#3a1d86" />
      </div>
      <div className="min-w-0 space-y-1 text-[11px] leading-relaxed">
        <p className="text-xs font-semibold">Verifique esta carteirinha</p>
        <p className="text-neutral-500">Aponte a câmera para o QR Code para confirmar a membresia.</p>
        <p className="pt-2">Nascimento: {formatDate(m.nascimento)}</p>
        <p className="truncate">{church.endereco.cidade}/{church.endereco.uf} · {church.telefone}</p>
        <p className="pt-2 border-t border-neutral-200 font-medium">{church.pastor}</p>
        <p className="text-neutral-500">Pastor responsável</p>
      </div>
    </div>
  )
}
