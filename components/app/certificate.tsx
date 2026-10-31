import { LogoMark } from "@/components/brand"
import { LogoImg } from "@/components/app/church-logo"
import { formatDateLong } from "@/lib/format"
import type { CertificateStyle, Church, Member } from "@/lib/types"
import { cn } from "@/lib/utils"

// Usado na emissão (/app/certificados) e no portal do membro (/membro), que mostra os certificados já emitidos.

const TEXTO: Record<string, (detalhe: string) => string> = {
  Batismo: (d) => `foi batizado(a) nas águas em nome do Pai, do Filho e do Espírito Santo${d ? `, ${d}` : ""}, conforme Mateus 28:19.`,
  "Apresentação de criança": (d) => `foi apresentado(a) ao Senhor nesta igreja${d ? `, ${d}` : ""}, sendo consagrado(a) em oração pela comunidade.`,
  "Conclusão de curso": (d) => `concluiu com aproveitamento o ${d || "curso oferecido por esta igreja"}.`,
  "Participação em congresso": (d) => `participou do ${d || "congresso realizado por esta igreja"}.`,
  Membresia: () => "é membro desta igreja em plena comunhão, sendo recomendado(a) às igrejas irmãs.",
  Casamento: (d) => `celebrou casamento nesta igreja${d ? ` com ${d}` : ""}, diante de Deus e da comunidade.`,
}

/** Certificado no formato A4 deitado; dentro de `.print-area` sai sozinho na impressão. */
export function Certificate({ m, church, tipo, detalhe, data, estilo }: { m: Member; church: Church; tipo: string; detalhe: string; data: string; estilo: CertificateStyle }) {
  return (
    <div
      className={cn(
        "relative flex aspect-[1.414] w-full flex-col items-center justify-center overflow-hidden bg-white p-[6%] text-center text-neutral-900",
        estilo === "classico" && "border-[10px] border-double border-[#b8862b] font-heading",
        estilo === "moderno" && "border border-neutral-200",
        estilo === "minimalista" && "border border-neutral-200"
      )}
    >
      {estilo === "moderno" && (
        <>
          <div className="absolute inset-y-0 left-0 w-[6%] bg-linear-to-b from-[#5b2fc4] to-[#3a1d86]" />
          <div className="absolute top-0 right-0 size-[22%] rounded-bl-full bg-[#f2b84b]/40" />
        </>
      )}
      <LogoImg church={church} className="h-[12%] min-h-8 w-auto max-w-[20%]" fallback={<LogoMark className="size-[8%] min-w-6" />} />
      <p className="mt-[2%] text-[clamp(8px,1.4vw,13px)] tracking-[0.25em] uppercase text-neutral-500">{church.nome}</p>
      <h3 className={cn("mt-[3%] text-[clamp(16px,3.6vw,36px)] font-semibold", estilo === "classico" ? "text-[#8a5f12]" : "text-[#3a1d86]")}>
        Certificado de {tipo}
      </h3>
      <p className="mt-[3%] text-[clamp(8px,1.3vw,13px)] text-neutral-500">Certificamos que</p>
      <p className="mt-[1%] font-heading text-[clamp(14px,3vw,30px)] italic">{m.nome}</p>
      <p className="mt-[2%] max-w-[80%] text-[clamp(8px,1.3vw,13px)] leading-relaxed text-neutral-700">{TEXTO[tipo]?.(detalhe)}</p>
      <p className="mt-[3%] text-[clamp(8px,1.2vw,12px)] text-neutral-500">
        {church.endereco.cidade}, {formatDateLong(data)}
      </p>
      <div className="mt-[5%] flex w-full max-w-[70%] justify-around gap-6 text-[clamp(7px,1.1vw,11px)]">
        <div className="flex-1 border-t border-neutral-400 pt-1">{church.pastor}<br /><span className="text-neutral-500">Pastor presidente</span></div>
        <div className="flex-1 border-t border-neutral-400 pt-1">Secretaria<br /><span className="text-neutral-500">{church.sigla}</span></div>
      </div>
    </div>
  )
}
