import type { UserRole } from "./types"

export type Area =
  | "membros"
  | "visitas"
  | "certificados"
  | "agenda"
  | "financeiro"
  | "whatsapp"
  | "configuracoes"

/** O que cada função pode alterar. O admin pode tudo. Usado no servidor (vale) e na tela (só esconde botões). */
const ESCRITA: Record<Exclude<UserRole, "admin">, Area[]> = {
  secretaria: ["membros", "visitas", "certificados", "agenda"],
  tesouraria: ["financeiro"],
  pastor: ["membros", "visitas", "agenda"],
  lider: ["agenda"],
}

/** Áreas cujos dados só são enviados ao navegador de quem pode vê-los. */
const LEITURA_RESTRITA: Partial<Record<Area, UserRole[]>> = {
  financeiro: ["admin", "tesouraria"],
}

export function canWrite(papel: UserRole, area: Area) {
  return papel === "admin" || ESCRITA[papel].includes(area)
}

export function canRead(papel: UserRole, area: Area) {
  return LEITURA_RESTRITA[area]?.includes(papel) ?? true
}
