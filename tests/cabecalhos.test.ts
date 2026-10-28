import { describe, expect, it } from "vitest"

import nextConfig from "@/next.config"

// Os cabeçalhos de segurança saem em todas as páginas (next.config.ts). Testados no navegador: o login do Clerk
// carrega sem bloqueio e o site não abre dentro de moldura de outro site.

const cabecalhos = async () => {
  const regras = (await nextConfig.headers?.()) ?? []
  const todas = regras.find((r) => r.source === "/:path*")
  return new Map((todas?.headers ?? []).map((h) => [h.key.toLowerCase(), h.value]))
}

describe("cabeçalhos de segurança", () => {
  it("valem para todas as páginas", async () => {
    const h = await cabecalhos()
    expect(h.get("x-frame-options")).toBe("DENY")
    expect(h.get("x-content-type-options")).toBe("nosniff")
    expect(h.get("referrer-policy")).toBe("strict-origin-when-cross-origin")
    expect(h.get("strict-transport-security")).toContain("max-age=")
  })

  it("a CSP impede moldura, plugins e scripts de sites desconhecidos", async () => {
    const csp = (await cabecalhos()).get("content-security-policy") ?? ""
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("form-action 'self'")
    const script = csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? ""
    expect(script).not.toMatch(/\s\*(\s|$)|https:(\s|$)/)
  })

  it("câmera só pelo próprio site; microfone e localização desligados", async () => {
    const p = (await cabecalhos()).get("permissions-policy") ?? ""
    expect(p).toContain("camera=(self)")
    expect(p).toContain("microphone=()")
    expect(p).toContain("geolocation=()")
  })
})
