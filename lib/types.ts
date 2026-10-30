export type MemberStatus = "ativo" | "afastado" | "visitante" | "transferido"
export type Sexo = "M" | "F"

export interface Endereco {
  rua: string
  numero: string
  bairro: string
  cidade: string
  uf: string
  cep: string
}

export interface Member {
  id: string
  nome: string
  sexo: Sexo
  nascimento: string // ISO date
  telefone: string
  email: string
  estadoCivil: "solteiro" | "casado" | "divorciado" | "viuvo"
  endereco: Endereco
  lat: number
  lng: number
  congregacao: string
  cargo: string
  ministerios: string[]
  status: MemberStatus
  batizado: boolean
  dataBatismo?: string
  membroDesde: string
  observacoes?: string
}

export interface Visit {
  id: string
  membroId: string
  data: string
  responsavel: string
  motivo: string
  notas: string
  proximaVisita?: string
}

export type TransactionType = "entrada" | "saida"

export interface Transaction {
  id: string
  tipo: TransactionType
  categoria: string
  valor: number
  data: string
  descricao: string
  membroId?: string
  formaPagamento: "pix" | "dinheiro" | "cartao" | "transferencia" | "boleto"
}

export interface ChurchEvent {
  id: string
  titulo: string
  data: string
  hora: string
  local: string
  tipo: "culto" | "reuniao" | "evento" | "ensaio" | "curso"
  descricao?: string
}

export interface IssuedCertificate {
  id: string
  membroId: string
  tipo: string
  estilo: CertificateStyle
  emitidoEm: string
  detalhe: string
}

export type CertificateStyle = "classico" | "moderno" | "minimalista"

export interface Cell {
  id: string
  nome: string
  /** Sede ou filial a que a célula pertence. */
  congregacao: string
  /** 0 = domingo … 6 = sábado */
  diaSemana?: number
  horario: string
  endereco: Endereco
  /** Posição da casa do anfitrião; 0/0 quando ainda não foi marcada. */
  lat: number
  lng: number
  /** Até duas pessoas (um casal) em cada função. */
  lideres: string[]
  colideres: string[]
  anfitrioes: string[]
  membroIds: string[]
}

export interface CellVisitor {
  nome: string
  telefone: string
}

export interface CellMeeting {
  id: string
  celulaId: string
  data: string
  presentes: string[]
  visitantes: CellVisitor[]
  observacoes: string
}

export interface CellStudy {
  id: string
  /** Segunda-feira da semana (aaaa-mm-dd). */
  semana: string
  tema: string
  referencia: string
  texto: string
}

export type UserRole = "admin" | "secretaria" | "tesouraria" | "pastor" | "lider"

export interface AppUser {
  id: string
  nome: string
  email: string
  papel: UserRole
  ativo: boolean
  /** Convidado que ainda não fez o primeiro acesso. */
  pendente: boolean
  /** Cadastro de membro da pessoa; é o que liga o líder de célula às células dele. */
  memberId?: string
  /** Filial a que o acesso está restrito (secretaria ou pastor de filial). Vazio = igreja toda. */
  congregacao?: string
}

/** Sede ou filial. A sede é a própria igreja: usa o endereço e a posição dela. */
export interface Filial {
  id: string
  nome: string
  sede: boolean
  dirigente: string
  telefone: string
  endereco: Endereco
  lat: number
  lng: number
}

export interface Church {
  nome: string
  sigla: string
  cnpj: string
  pastor: string
  telefone: string
  email: string
  endereco: Endereco
  /** Nomes da sede e das filiais, a sede primeiro (é o que vai em `Member.congregacao`). */
  congregacoes: string[]
  filiais: Filial[]
  /** Posição da igreja; 0/0 enquanto o endereço não foi localizado. */
  lat: number
  lng: number
  logoUrl?: string
}

export interface WhatsAppSettings {
  conectado: boolean
  numero?: string
  diasAntecedencia: number
  mensagemAniversario: string
  envioAutomatico: boolean
}

/** Tudo o que o painel precisa, carregado do banco no servidor para a igreja ativa. */
export interface School {
  id: string
  nome: string
  descricao: string
}

export type SituacaoAluno = "cursando" | "concluido" | "desistiu"

/** Pessoas da turma vêm com o nome: o professor nem sempre recebe o cadastro de membro delas. */
export interface SchoolClass {
  id: string
  escolaId: string
  nome: string
  inicio?: string
  horario: string
  local: string
  professores: { id: string; nome: string }[]
  alunos: { id: string; nome: string; situacao: SituacaoAluno; concluidoEm?: string }[]
}

export interface SchoolLesson {
  id: string
  turmaId: string
  data: string
  tema: string
  presentes: string[]
}

export interface AppData {
  me: AppUser
  church: Church
  members: Member[]
  visits: Visit[]
  transactions: Transaction[]
  events: ChurchEvent[]
  certificates: IssuedCertificate[]
  cells: Cell[]
  /** Reuniões dos últimos 12 meses. */
  cellMeetings: CellMeeting[]
  /** Estudos da semana dos últimos 12 meses e os já programados. */
  cellStudies: CellStudy[]
  schools: School[]
  /** Todas as turmas, ou só as que o usuário ensina (lib/data.ts › turmasVisiveis). */
  schoolClasses: SchoolClass[]
  schoolLessons: SchoolLesson[]
  users: AppUser[]
  whatsapp: WhatsAppSettings
}
