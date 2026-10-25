import "server-only"

import { db } from "./db"
import { ActionError, type Session } from "./church"
import type * as P from "./generated/prisma/client"
import { canRead, memberScope } from "./permissions"
import type {
  AppData,
  AppUser,
  Cell,
  CellMeeting,
  CellStudy,
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

export const cellInclude = {
  leaders: { select: { memberId: true, funcao: true } },
  members: { select: { id: true }, orderBy: { nome: "asc" } },
} as const

type CellRow = P.Cell & {
  leaders: { memberId: string; funcao: P.CellRole }[]
  members: { id: string }[]
}

export function toCell(r: CellRow): Cell {
  const funcao = (f: P.CellRole) => r.leaders.filter((l) => l.funcao === f).map((l) => l.memberId)
  return {
    id: r.id,
    nome: r.nome,
    diaSemana: r.diaSemana ?? undefined,
    horario: r.horario,
    endereco: { rua: r.rua, numero: r.numero, bairro: r.bairro, cidade: r.cidade, uf: r.uf.trim(), cep: r.cep },
    lat: r.lat ?? 0,
    lng: r.lng ?? 0,
    lideres: funcao("lider"),
    colideres: funcao("colider"),
    anfitrioes: funcao("anfitriao"),
    membroIds: r.members.map((m) => m.id),
  }
}

export const cellMeetingInclude = {
  presencas: { select: { memberId: true } },
  visitantes: { select: { nome: true, telefone: true }, orderBy: { id: "asc" } },
} as const

export const toCellMeeting = (
  r: P.CellMeeting & { presencas: { memberId: string }[]; visitantes: { nome: string; telefone: string }[] }
): CellMeeting => ({
  id: r.id,
  celulaId: r.cellId,
  data: toISO(r.data),
  presentes: r.presencas.map((p) => p.memberId),
  visitantes: r.visitantes,
  observacoes: r.observacoes,
})

export const toCellStudy = (r: P.CellStudy): CellStudy => ({
  id: r.id,
  semana: toISO(r.semana),
  tema: r.tema,
  referencia: r.referencia,
  texto: r.texto,
})

export const toUser = (r: P.ChurchUser): AppUser => ({
  id: r.id,
  nome: r.nome,
  email: r.email,
  papel: r.papel,
  ativo: r.ativo,
  pendente: !r.clerkUserId,
  memberId: r.memberId ?? undefined,
})

/**
 * Células que o usuário pode ver e lançar reunião. O líder de célula só aquelas em que é líder ou colíder
 * (pelo cadastro de membro ligado ao usuário); as outras funções, todas.
 */
export function cellScope(user: P.ChurchUser): P.Prisma.CellWhereInput {
  if (user.papel !== "lider") return {}
  return { leaders: { some: { memberId: user.memberId ?? "-", funcao: { in: ["lider", "colider"] } } } }
}

export const toChurch = (r: P.Church, congregacoes: string[]): Church => ({
  nome: r.nome,
  sigla: r.sigla,
  cnpj: r.cnpj,
  pastor: r.pastor,
  telefone: r.telefone,
  email: r.email,
  endereco: { rua: r.rua, numero: r.numero, bairro: r.bairro, cidade: r.cidade, uf: r.uf.trim(), cep: r.cep },
  congregacoes,
  lat: r.lat ?? 0,
  lng: r.lng ?? 0,
  logoUrl: r.logoUrl ?? undefined,
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

const SEM_ENDERECO = { rua: "", numero: "", bairro: "", cidade: "", uf: "", cep: "" }

/** Tira do membro o que a função não pode ver (ver `memberScope`). */
function protegerMembro(m: Member, escopo: ReturnType<typeof memberScope>): Member {
  if (escopo === "completo") return m
  const semMapa = { ...m, lat: 0, lng: 0, observacoes: undefined }
  if (escopo === "celula") return semMapa
  return { ...semMapa, telefone: "", email: "", endereco: SEM_ENDERECO }
}

/** Carrega os dados da igreja ativa. Cada consulta é filtrada pela igreja e o que a função não pode ver não sai do servidor. */
export async function loadAppData({ church, user }: Session): Promise<AppData> {
  const churchId = church.id
  const pode = (area: Parameters<typeof canRead>[1]) => canRead(user.papel, area)
  const admin = user.papel === "admin"
  const escopo = memberScope(user.papel)
  // O líder de célula só recebe as pessoas das células que lidera.
  const membrosWhere = escopo === "celula" ? { churchId, cell: cellScope(user) } : { churchId }

  const umAnoAtras = new Date(Date.now() - 365 * 86_400_000)

  const [congregacoes, members, visits, transactions, events, certificates, cells, cellMeetings, cellStudies, users] = await Promise.all([
    congregationNames(churchId),
    db.member.findMany({ where: membrosWhere, include: memberInclude, orderBy: { nome: "asc" } }),
    pode("visitas") ? db.visit.findMany({ where: { churchId }, orderBy: { data: "desc" } }) : [],
    pode("financeiro") ? db.transaction.findMany({ where: { churchId }, orderBy: { data: "desc" } }) : [],
    db.event.findMany({ where: { churchId }, orderBy: [{ data: "asc" }, { hora: "asc" }] }),
    pode("certificados") ? db.certificate.findMany({ where: { churchId }, orderBy: { emitidoEm: "desc" } }) : [],
    pode("celulas")
      ? db.cell.findMany({ where: { churchId, ...cellScope(user) }, include: cellInclude, orderBy: { nome: "asc" } })
      : [],
    pode("celulas")
      ? db.cellMeeting.findMany({
          where: { churchId, data: { gte: umAnoAtras }, cell: cellScope(user) },
          include: cellMeetingInclude,
          orderBy: { data: "desc" },
        })
      : [],
    db.cellStudy.findMany({ where: { churchId, semana: { gte: umAnoAtras } }, orderBy: { semana: "desc" } }),
    admin ? db.churchUser.findMany({ where: { churchId }, orderBy: { createdAt: "asc" } }) : [],
  ])

  return {
    me: toUser(user),
    church: toChurch(church, congregacoes),
    members: members.map((m) => protegerMembro(toMember(m), escopo)),
    visits: visits.map(toVisit),
    transactions: transactions.map(toTransaction),
    events: events.map(toEvent),
    certificates: certificates.map(toCertificate),
    cells: cells.map(toCell),
    cellMeetings: cellMeetings.map(toCellMeeting),
    cellStudies: cellStudies.map(toCellStudy),
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
