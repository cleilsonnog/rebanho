import type { NextConfig } from "next"

const dev = process.env.NODE_ENV !== "production"

/** Endereço da API do Clerk (FAPI), que vem dentro da chave pública: pk_test_<base64 de "host$">. */
function clerkHost() {
  const chave = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""
  const host = Buffer.from(chave.split("_")[2] ?? "", "base64").toString().replace(/\$$/, "")
  return host ? `https://${host}` : "https://*.clerk.accounts.dev"
}

// Política de conteúdo (CSP): de onde o navegador aceita carregar scripts, imagens, conexões e molduras.
// Sem nonce de propósito: com nonce, todas as páginas teriam de ser geradas a cada acesso (a landing deixaria de
// ser estática). Por isso scripts embutidos ('unsafe-inline') continuam permitidos; scripts de outros sites, não.
// Ao adicionar um serviço novo no navegador (mapa, analytics, pagamento), inclua o endereço dele aqui.
const csp = [
  "default-src 'self'",
  // *.protect.clerk.com: antifraude do login do Clerk (contra robôs).
  `script-src 'self' 'unsafe-inline' ${clerkHost()} https://*.protect.clerk.com https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' ${clerkHost()} https://*.protect.clerk.com:*${dev ? " ws: wss:" : ""}`,
  // img.clerk.com: fotos e logo; tile.openstreetmap.org: o mapa; blob:/data:: prévia da foto da ficha e ícones.
  "img-src 'self' data: blob: https://img.clerk.com https://*.tile.openstreetmap.org",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com https://*.protect.clerk.com",
  // Ninguém põe o Rebanho dentro de uma moldura (clickjacking); sem plugins; formulários só para o próprio site.
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ")

const seguranca = [
  { key: "Content-Security-Policy", value: csp },
  // Moldura bloqueada também para navegadores antigos que não leem frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Outros sites não recebem o endereço completo das páginas do painel (que tem ids de membros).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Câmera só pelo próprio site (foto da ficha); o resto, desligado.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: seguranca }]
  },
}

export default nextConfig
