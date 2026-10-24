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

export type UserRole = "admin" | "secretaria" | "tesouraria" | "pastor" | "lider"

export interface AppUser {
  id: string
  nome: string
  email: string
  papel: UserRole
  ativo: boolean
}

export interface Church {
  nome: string
  sigla: string
  cnpj: string
  pastor: string
  telefone: string
  email: string
  endereco: Endereco
  congregacoes: string[]
}

export interface WhatsAppSettings {
  conectado: boolean
  numero?: string
  diasAntecedencia: number
  mensagemAniversario: string
  envioAutomatico: boolean
}
