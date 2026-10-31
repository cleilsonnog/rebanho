import type { MetadataRoute } from "next"

// Manifest só do portal do membro (o app/manifest.ts valeria para o site todo): é o portal que o membro instala
// no celular, e o app instalado abre direto nele. Ligado pelo `metadata.manifest` de app/membro/page.tsx.
export function GET() {
  const manifest: MetadataRoute.Manifest = {
    id: "/membro",
    name: "Portal do membro · Rebanho",
    short_name: "Minha igreja",
    description: "Carteirinha, célula, escolas e agenda da sua igreja.",
    start_url: "/membro",
    scope: "/membro",
    display: "standalone",
    background_color: "#f6f5fb",
    theme_color: "#5f3cc5",
    lang: "pt-BR",
    icons: [
      { src: "/membro/icone/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/membro/icone/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/membro/icone/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
  return Response.json(manifest, { headers: { "Content-Type": "application/manifest+json" } })
}
