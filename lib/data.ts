import "server-only"

import { db } from "./db"
import { ActionError, type Session } from "./church"
import type * as P from "./generated/prisma/client"
import { canRead } from "./permissions"
import type {
  AppData,
  AppUser,
  Church,
  ChurchEvent,
  IssuedCertificate,
  Member,
  Transaction,
  Visit,
  WhatsAppSettings,
} from "./types"

// As colunas de data são `@db.Date` (meia-noite UTC); as telas trabalham com "aaaa-mm-dd".
export const toISO = (d: Date) => d.toISOString().slice(0, 10)
export const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`)
const toISOOpt = (d: Date | null) => (d ? toISO(d) : undefined)

export const memberInclude = { congregation: { select: { nome: true } } } as const

export function toMember(r: P.Member & { congregation: { nome: string } | null }): Member {
  return {
    id: r.id,
    nome: r.nome,
    sexo: r.sexo,
    nascimento: toISO(r.nascimento),
    telefone: r.telefone,
    email: r.email,
    estadoCivil: r.estadoCivil,
    endereco: { rua: r.rua, numero: r.numero, bairro: r.bairro, cidade: r.cidade, uf: r.uf.trim(), cep: r.cep },
    lat: r.lat ?? 0,
    lng: r.lng ?? 0,
    congregacao: r.congregation?.nome ?? "",
    cargo: r.cargo,
    ministerios: r.ministerios,
    status: r.status,
    batizado: r.batizado,
    dataBatismo: toISOOpt(r.dataBatismo),
    membroDesde: toISO(r.membroDesde),
    observacoes: r.observacoes ?? undefined,
  }
}

export const toVisit = (r: P.Visit): Visit => ({
  id: r.id,
  membroId: r.memberId,
  data: toISO(r.data),
  responsavel: r.responsavel,
  motivo: r.motivo,
  notas: r.notas,
  proximaVisita: toISOOpt(r.proximaVisita),
})

export const toTransaction = (r: P.Transaction): Transaction => ({
  id: r.id,
  tipo: r.tipo,
  categoria: r.categoria,
  valor: r.valor.toNumber(),
  data: toISO(r.data),
  descricao: r.descricao,
  membroId: r.memberId ?? undefined,
  formaPagamento: r.formaPagamento,
})

export const toEvent = (r: P.Event): ChurchEvent => ({
  id: r.id,
  titulo: r.titulo,
  data: toISO(r.data),
  hora: r.hora,
  local: r.local,
  tipo: r.tipo,
  descricao: r.descricao ?? undefined,
})

export const toCertificate = (r: P.Certificate): IssuedCertificate => ({
  id: r.id,
  membroId: r.memberId,
  tipo: r.tipo,
  estilo: r.estilo,
  emitidoEm: toISO(r.emitidoEm),
  detalhe: r.detalhe,
})

export const toUser = (r: P.ChurchUser): AppUser => ({
  id: r.id,
  nome: r.nome,
  email: r.email,
  papel: r.papel,
  ativo: r.ativo,
  pendente: !r.clerkUserId,
})

export const toChurch = (r: P.Church, congregacoes: string[]): Church => ({
  nome: r.nome,
  sigla: r.sigla,
  cnpj: r.cnpj,
  pastor: r.pastor,
  telefone: r.telefone,
  email: r.email,
  endereco: { rua: r.rua, numero: r.numero, bairro: r.bairro, cidade: r.cidade, uf: r.uf.trim(), cep: r.cep },
  congregacoes,
})

export const toWhatsApp = (r: P.Church): WhatsAppSettings => ({
  conectado: r.whatsappConectado,
  numero: r.whatsappNumero ?? undefined,
  diasAntecedencia: r.whatsappDiasAntes,
  mensagemAniversario: r.whatsappMensagem,
  envioAutomatico: r.whatsappAutomatico,
})

export async function congregationNames(churchId: string) {
  const cs = await db.congregation.findMany({ where: { churchId }, orderBy: { id: "asc" }, select: { nome: true } })
  return cs.map((c) => c.nome)
}

/** Carrega os dados da igreja ativa. Cada consulta é filtrada pela igreja e o que a função não pode ver não sai do servidor. */
export async function loadAppData({ church, user }: Session): Promise<AppData> {
  const churchId = church.id
  const veFinanceiro = canRead(user.papel, "financeiro")
  const admin = user.papel === "admin"

  const [congregacoes, members, visits, transactions, events, certificates, users] = await Promise.all([
    congregationNames(churchId),
    db.member.findMany({ where: { churchId }, include: memberInclude, orderBy: { nome: "asc" } }),
    db.visit.findMany({ where: { churchId }, orderBy: { data: "desc" } }),
    veFinanceiro ? db.transaction.findMany({ where: { churchId }, orderBy: { data: "desc" } }) : [],
    db.event.findMany({ where: { churchId }, orderBy: [{ data: "asc" }, { hora: "asc" }] }),
    db.certificate.findMany({ where: { churchId }, orderBy: { emitidoEm: "desc" } }),
    admin ? db.churchUser.findMany({ where: { churchId }, orderBy: { createdAt: "asc" } }) : [],
  ])

  return {
    me: toUser(user),
    church: toChurch(church, congregacoes),
    members: members.map(toMember),
    visits: visits.map(toVisit),
    transactions: transactions.map(toTransaction),
    events: events.map(toEvent),
    certificates: certificates.map(toCertificate),
    users: users.map(toUser),
    whatsapp: toWhatsApp(church),
  }
}

/** Garante que todos os membros citados são da igreja; impede ligar registros a pessoas de outra igreja. */
export async function assertMembers(churchId: string, ids: string[]) {
  const unicos = [...new Set(ids)]
  const n = await db.member.count({ where: { churchId, id: { in: unicos } } })
  if (n !== unicos.length) throw new ActionError("Pessoa não encontrada nesta igreja.")
}
