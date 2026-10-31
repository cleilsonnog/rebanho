import { ImageResponse } from "next/og"

// Ícone do portal instalado no celular, nos tamanhos que o Android pede. A marca fica no centro, com folga nas
// bordas: o Android recorta o ícone em círculo ou outros formatos ("maskable").
const TAMANHOS = [192, 512]

export function generateStaticParams() {
  return TAMANHOS.map((t) => ({ tamanho: String(t) }))
}

export async function GET(_: Request, { params }: { params: Promise<{ tamanho: string }> }) {
  const t = Number((await params).tamanho)
  if (!TAMANHOS.includes(t)) return new Response("Tamanho inválido", { status: 404 })
  const marca = Math.round(t * 0.62)
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#5f3cc5" }}>
        <svg viewBox="0 0 32 32" width={marca} height={marca}>
          <path d="M13 25V12.5a5 5 0 1 1 10 0c0 2.2-1.6 3.6-3.5 3.6" fill="none" stroke="#fcfbff" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="21.5" cy="23" r="2.4" fill="#f5ae39" />
        </svg>
      </div>
    ),
    { width: t, height: t }
  )
}
