import type { UserRole } from "./types"

export type Area =
  | "membros"
  | "visitas"
  | "certificados"
  | "agenda"
  | "celulas"
  | "reunioes"
  | "estudos"
  | "financeiro"
  | "whatsapp"
  | "configuracoes"
  | "mapa"

/** O que cada função pode alterar. O admin pode tudo. Usado no servidor (vale) e na tela (só esconde botões). */
const ESCRITA: Record<Exclude<UserRole, "admin">, Area[]> = {
  secretaria: ["membros", "visitas", "certificados", "agenda", "celulas", "reunioes", "estudos"],
  tesouraria: ["financeiro"],
  pastor: ["membros", "visitas", "agenda", "reunioes", "estudos"],
  // Líder de célula: lança as reuniões só das células que lidera (filtro em lib/data.ts › cellScope).
  // Montar a célula (liderança e membros) é da secretaria.
  lider: ["agenda", "reunioes"],
}

const CUIDADO_PASTORAL: UserRole[] = ["admin", "secretaria", "pastor"]

/** Áreas cujos dados só são enviados ao navegador de quem pode vê-los. */
const LEITURA_RESTRITA: Partial<Record<Area, UserRole[]>> = {
  financeiro: ["admin", "tesouraria"],
  // Endereços no mapa e anotações de visita expõem a vida das famílias: só quem cuida delas.
  mapa: CUIDADO_PASTORAL,
  visitas: CUIDADO_PASTORAL,
  certificados: CUIDADO_PASTORAL,
  // O líder de célula só recebe as células que lidera (lib/data.ts › cellScope).
  celulas: [...CUIDADO_PASTORAL, "lider"],
}

/**
 * Quais membros e quais dados deles a função recebe do servidor:
 * - "completo": todos, com contato, endereço e posição no mapa;
 * - "celula": só os das células que lidera, com contato e endereço, sem posição no mapa nem observações;
 * - "nome": todos, só com nome e dados sem contato (a tesouraria liga o dízimo à pessoa).
 */
export function memberScope(papel: UserRole): "completo" | "celula" | "nome" {
  if (CUIDADO_PASTORAL.includes(papel)) return "completo"
  return papel === "lider" ? "celula" : "nome"
}

export function canWrite(papel: UserRole, area: Area) {
  return papel === "admin" || ESCRITA[papel].includes(area)
}

export function canRead(papel: UserRole, area: Area) {
  return LEITURA_RESTRITA[area]?.includes(papel) ?? true
}
