import { ImageResponse } from "next/og"

// Ícone da tela inicial do iPhone/iPad. O iOS não aceita SVG e arredonda os cantos sozinho,
// por isso o fundo ocupa o quadrado inteiro.
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#5f3cc5" }}>
        <svg viewBox="0 0 32 32" width="180" height="180">
          <path
            d="M13 25V12.5a5 5 0 1 1 10 0c0 2.2-1.6 3.6-3.5 3.6"
            fill="none"
            stroke="#fcfbff"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="21.5" cy="23" r="2.4" fill="#f5ae39" />
        </svg>
      </div>
    ),
    size
  )
}
