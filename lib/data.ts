import "server-only"

import { db } from "./db"
import { ActionError, type Session } from "./church"
import type * as P from "./generated/prisma/client"
import { canRead, canWrite, memberScope } from "./permissions"
import type {
  AppData,
  AppUser,
  Cell,
  CellMeeting,
  CellStudy,
  Church,
  ChurchEvent,
  Filial,
  IssuedCertificate,
  Member,
  School,
  SchoolClass,
  SchoolLesson,
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
  congregation: { select: { nome: true } },
  leaders: { select: { memberId: true, funcao: true } },
  members: { select: { id: true }, orderBy: { nome: "asc" } },
} as const

type CellRow = P.Cell & {
  congregation: { nome: string } | null
  leaders: { memberId: string; funcao: P.CellRole }[]
  members: { id: string }[]
}

export function toCell(r: CellRow): Cell {
  const funcao = (f: P.CellRole) => r.leaders.filter((l) => l.funcao === f).map((l) => l.memberId)
  return {
    id: r.id,
    nome: r.nome,
    congregacao: r.congregation?.nome ?? "",
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

export const toSchool = (r: P.School): School => ({ id: r.id, nome: r.nome, descricao: r.descricao })

const pessoa = { select: { id: true, nome: true } } as const

export const schoolClassInclude = {
  teachers: { select: { member: pessoa }, orderBy: { member: { nome: "asc" } } },
  students: { select: { member: pessoa, situacao: true, concluidoEm: true }, orderBy: { member: { nome: "asc" } } },
} as const

type SchoolClassRow = P.SchoolClass & {
  teachers: { member: { id: string; nome: string } }[]
  students: { member: { id: string; nome: string }; situacao: P.EnrollmentStatus; concluidoEm: Date | null }[]
}

export const toSchoolClass = (r: SchoolClassRow): SchoolClass => ({
  id: r.id,
  escolaId: r.schoolId,
  nome: r.nome,
  inicio: toISOOpt(r.inicio),
  horario: r.horario,
  local: r.local,
  professores: r.teachers.map((t) => t.member),
  alunos: r.students.map((s) => ({ ...s.member, situacao: s.situacao, concluidoEm: toISOOpt(s.concluidoEm) })),
})

export const schoolLessonInclude = { presencas: { select: { memberId: true } } } as const

export const toSchoolLesson = (r: P.SchoolLesson & { presencas: { memberId: string }[] }): SchoolLesson => ({
  id: r.id,
  turmaId: r.classId,
  data: toISO(r.data),
  tema: r.tema,
  presentes: r.presencas.map((p) => p.memberId),
})

const professorDe = (user: P.ChurchUser): P.Prisma.SchoolClassWhereInput => ({
  teachers: { some: { memberId: user.memberId ?? "-" } },
})

/** Turmas que o usuário vê: admin, secretaria e pastor, todas; os demais, só as que ensinam. */
export function turmasVisiveis(user: P.ChurchUser): P.Prisma.SchoolClassWhereInput {
  return ["admin", "secretaria", "pastor"].includes(user.papel) ? {} : professorDe(user)
}

/** Turmas em que o usuário lança aulas: quem cuida das escolas, todas; os demais (pastor inclusive), só as que ensinam. */
export function turmasDoProfessor(user: P.ChurchUser): P.Prisma.SchoolClassWhereInput {
  return canWrite(user.papel, "escolas") ? {} : professorDe(user)
}

export const userInclude = { congregation: { select: { nome: true } } } as const

export const toUser = (r: P.ChurchUser & { congregation?: { nome: string } | null }): AppUser => ({
  id: r.id,
  nome: r.nome,
  email: r.email,
  papel: r.papel,
  ativo: r.ativo,
  pendente: !r.clerkUserId,
  memberId: r.memberId ?? undefined,
  congregacao: r.congregation?.nome,
})

/** Filial a que o usuário está restrito. Só vale para secretaria e pastor; `null` = igreja toda. */
export function filialDe(user: P.ChurchUser) {
  return user.papel === "secretaria" || user.papel === "pastor" ? user.congregationId : null
}

/** Membros que o usuário pode ver e alterar, pela filial (o líder de célula usa `cellScope`). */
export function membrosScope(user: P.ChurchUser): { congregationId?: string } {
  const filial = filialDe(user)
  return filial ? { congregationId: filial } : {}
}

/**
 * Células que o usuário pode ver e lançar reunião. O líder de célula só aquelas em que é líder ou colíder
 * (pelo cadastro de membro ligado ao usuário); quem é de uma filial, as da filial; os demais, todas.
 */
export function cellScope(user: P.ChurchUser): P.Prisma.CellWhereInput {
  const filial = filialDe(user)
  if (filial) return { congregationId: filial }
  if (user.papel !== "lider") return {}
  return { leaders: { some: { memberId: user.memberId ?? "-", funcao: { in: ["lider", "colider"] } } } }
}

export const toChurch = (r: P.Church, filiais: Filial[]): Church => ({
  nome: r.nome,
  sigla: r.sigla,
  cnpj: r.cnpj,
  pastor: r.pastor,
  telefone: r.telefone,
  email: r.email,
  endereco: { rua: r.rua, numero: r.numero, bairro: r.bairro, cidade: r.cidade, uf: r.uf.trim(), cep: r.cep },
  congregacoes: filiais.map((f) => f.nome),
  filiais,
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

/** Sede e filiais, a sede primeiro (a mais antiga). A sede usa o endereço e a posição da igreja. */
export async function loadFiliais(church: P.Church): Promise<Filial[]> {
  const cs = await db.congregation.findMany({ where: { churchId: church.id }, orderBy: { id: "asc" } })
  return cs.map((c, i) => {
    const sede = i === 0
    const fonte = sede ? church : c
    return {
      id: c.id,
      nome: c.nome,
      sede,
      dirigente: c.dirigente,
      telefone: c.telefone,
      endereco: { rua: fonte.rua, numero: fonte.numero, bairro: fonte.bairro, cidade: fonte.cidade, uf: fonte.uf.trim(), cep: fonte.cep },
      lat: fonte.lat ?? 0,
      lng: fonte.lng ?? 0,
    }
  })
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
  const membrosWhere = escopo === "celula" ? { churchId, cell: cellScope(user) } : { churchId, ...membrosScope(user) }
  // Visitas e certificados acompanham os membros que a pessoa vê (a filial dela, se for de filial).
  const dosMembros = { churchId, member: membrosScope(user) }

  const umAnoAtras = new Date(Date.now() - 365 * 86_400_000)

  const turmas = { churchId, ...turmasVisiveis(user) }
  const professorSo = Object.keys(turmasVisiveis(user)).length > 0

  const [filiais, members, visits, transactions, events, certificates, cells, cellMeetings, cellStudies, schools, schoolClasses, schoolLessons, users] = await Promise.all([
    loadFiliais(church),
    db.member.findMany({ where: membrosWhere, include: memberInclude, orderBy: { nome: "asc" } }),
    pode("visitas") ? db.visit.findMany({ where: dosMembros, orderBy: { data: "desc" } }) : [],
    pode("financeiro") ? db.transaction.findMany({ where: { churchId }, orderBy: { data: "desc" } }) : [],
    db.event.findMany({ where: { churchId }, orderBy: [{ data: "asc" }, { hora: "asc" }] }),
    pode("certificados") ? db.certificate.findMany({ where: dosMembros, orderBy: { emitidoEm: "desc" } }) : [],
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
    // O professor recebe só as escolas das turmas dele; quem vê todas as turmas, todas as escolas (até as sem turma).
    db.school.findMany({ where: { churchId, ...(professorSo && { classes: { some: turmasVisiveis(user) } }) }, orderBy: { nome: "asc" } }),
    db.schoolClass.findMany({ where: turmas, include: schoolClassInclude, orderBy: [{ inicio: "desc" }, { nome: "asc" }] }),
    db.schoolLesson.findMany({ where: { churchId, class: turmasVisiveis(user) }, include: schoolLessonInclude, orderBy: { data: "desc" } }),
    admin ? db.churchUser.findMany({ where: { churchId }, include: userInclude, orderBy: { createdAt: "asc" } }) : [],
  ])

  return {
    me: toUser({ ...user, congregation: filiais.find((f) => f.id === filialDe(user)) ?? null }),
    church: toChurch(church, filiais),
    members: members.map((m) => protegerMembro(toMember(m), escopo)),
    visits: visits.map(toVisit),
    transactions: transactions.map(toTransaction),
    events: events.map(toEvent),
    certificates: certificates.map(toCertificate),
    cells: cells.map(toCell),
    cellMeetings: cellMeetings.map(toCellMeeting),
    cellStudies: cellStudies.map(toCellStudy),
    schools: schools.map(toSchool),
    schoolClasses: schoolClasses.map(toSchoolClass),
    schoolLessons: schoolLessons.map(toSchoolLesson),
    users: users.map(toUser),
    whatsapp: toWhatsApp(church),
  }
}

/** Garante que todos os membros citados são da igreja; impede ligar registros a pessoas de outra igreja. */
export async function assertMembers(churchId: string, ids: string[], scope: P.Prisma.MemberWhereInput = {}) {
  const unicos = [...new Set(ids)]
  const n = await db.member.count({ where: { churchId, ...scope, id: { in: unicos } } })
  if (n !== unicos.length) throw new ActionError("Pessoa não encontrada nesta igreja.")
}
