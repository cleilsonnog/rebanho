import { z } from "zod"

// Esquemas compartilhados: os formulários validam com eles no navegador (para mostrar o erro no campo)
// e as Server Actions validam de novo no servidor, que é a validação que vale.

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const

const texto = (max: number) => z.string().trim().max(max, `Use no máximo ${max} caracteres`)
const obrigatorio = (max: number, campo = "Campo") => texto(max).min(1, `${campo} é obrigatório`)
const opcional = (max: number) =>
  texto(max)
    .optional()
    .transform((v) => v || undefined)

const id = z.string().trim().min(1, "Registro inválido").max(64, "Registro inválido")

const data = z.iso.date("Data inválida")
const dataOpcional = z
  .union([z.literal(""), data])
  .optional()
  .transform((v) => v || undefined)
const hoje = () => new Date().toISOString().slice(0, 10)

const telefone = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{10,13}$/.test(v.replace(/\D/g, "")), "Telefone inválido. Use DDD + número")

const email = z.union([z.literal(""), z.email("E-mail inválido").max(254)])

function cnpjValido(v: string) {
  const d = v.replace(/\D/g, "")
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const dv = (len: number) => {
    let soma = 0
    let peso = len - 7
    for (let i = 0; i < len; i++) {
      soma += Number(d[i]) * peso--
      if (peso < 2) peso = 9
    }
    const r = soma % 11
    return r < 2 ? 0 : 11 - r
  }
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13])
}

export const enderecoSchema = z.object({
  rua: texto(200),
  numero: texto(20),
  bairro: texto(100),
  cidade: texto(100),
  uf: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || (UFS as readonly string[]).includes(v), "UF inválida"),
  cep: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{5}-?\d{3}$/.test(v), "CEP inválido. Use 00000-000"),
})

export const memberSchema = z
  .object({
    nome: obrigatorio(120, "Nome").min(2, "Informe o nome completo"),
    sexo: z.enum(["M", "F"], "Escolha o sexo"),
    nascimento: data.refine((v) => v >= "1900-01-01" && v <= hoje(), "Data de nascimento fora do intervalo"),
    telefone,
    email,
    estadoCivil: z.enum(["solteiro", "casado", "divorciado", "viuvo"], "Estado civil inválido"),
    endereco: enderecoSchema,
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    congregacao: texto(100),
    cargo: obrigatorio(60, "Cargo"),
    ministerios: z.array(texto(60)).max(30, "Ministérios demais"),
    status: z.enum(["ativo", "afastado", "visitante", "transferido"], "Situação inválida"),
    batizado: z.boolean(),
    dataBatismo: dataOpcional,
    membroDesde: data.refine((v) => v <= hoje(), "A data não pode estar no futuro"),
    observacoes: opcional(2000),
  })
  .refine((m) => !m.dataBatismo || m.dataBatismo >= m.nascimento, {
    path: ["dataBatismo"],
    message: "O batismo não pode ser antes do nascimento",
  })

export const importMembersSchema = z
  .array(memberSchema)
  .min(1, "Nenhuma pessoa para importar")
  .max(1000, "Importe no máximo 1000 pessoas por vez")

export const visitSchema = z
  .object({
    membroId: id,
    data: data.refine((v) => v <= hoje(), "A visita não pode estar no futuro"),
    responsavel: obrigatorio(80, "Responsável"),
    motivo: obrigatorio(60, "Motivo"),
    notas: obrigatorio(2000, "Anotações"),
    proximaVisita: dataOpcional,
  })
  .refine((v) => !v.proximaVisita || v.proximaVisita >= v.data, {
    path: ["proximaVisita"],
    message: "A próxima visita deve ser depois desta",
  })

export const transactionSchema = z.object({
  tipo: z.enum(["entrada", "saida"]),
  categoria: obrigatorio(60, "Categoria"),
  valor: z
    .number("Informe um valor")
    .positive("O valor deve ser maior que zero")
    .max(10_000_000, "Valor alto demais")
    .transform((v) => Math.round(v * 100) / 100),
  data,
  descricao: obrigatorio(200, "Descrição"),
  membroId: id.optional(),
  formaPagamento: z.enum(["pix", "dinheiro", "cartao", "transferencia", "boleto"], "Forma de pagamento inválida"),
})

export const eventSchema = z.object({
  titulo: obrigatorio(120, "Título"),
  data,
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida"),
  local: obrigatorio(120, "Local"),
  tipo: z.enum(["culto", "reuniao", "evento", "ensaio", "curso"], "Tipo inválido"),
  descricao: opcional(1000),
})

export const certificatesSchema = z.object({
  membroIds: z.array(id).min(1, "Escolha ao menos uma pessoa").max(500, "Emita no máximo 500 por vez"),
  tipo: obrigatorio(80, "Tipo"),
  estilo: z.enum(["classico", "moderno", "minimalista"]),
  emitidoEm: data,
  detalhe: texto(200),
})

const membroIds = (max: number, msg: string) =>
  z
    .array(id)
    .max(max, msg)
    .transform((ids) => [...new Set(ids)])

export const cellSchema = z.object({
  nome: obrigatorio(60, "Nome da célula"),
  /** Sede ou filial (nome); vazio = sede. */
  congregacao: texto(100),
  diaSemana: z.number().int().min(0).max(6).optional(),
  horario: z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido")]),
  endereco: enderecoSchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  lideres: membroIds(2, "Escolha no máximo 2 líderes").refine((l) => l.length > 0, "Escolha ao menos um líder"),
  colideres: membroIds(2, "Escolha no máximo 2 colíderes"),
  anfitrioes: membroIds(2, "Escolha no máximo 2 anfitriões"),
  membroIds: membroIds(300, "Pessoas demais numa célula"),
})

export const cellMeetingSchema = z.object({
  celulaId: id,
  data: data.refine((v) => v <= hoje(), "A reunião não pode estar no futuro"),
  presentes: membroIds(300, "Pessoas demais"),
  visitantes: z
    .array(z.object({ nome: obrigatorio(120, "Nome do visitante"), telefone }))
    .max(50, "Visitantes demais numa reunião"),
  observacoes: texto(4000),
})

export const cellStudySchema = z.object({
  /** Qualquer dia da semana; o servidor guarda a segunda-feira. */
  semana: data,
  tema: obrigatorio(120, "Tema"),
  referencia: texto(120),
  texto: obrigatorio(20_000, "Estudo"),
})

export const geocodeSchema = enderecoSchema

/** Pino marcado à mão no mapa; 0/0 (ou ausente) = o servidor localiza pelo endereço. */
const pino = {
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
}

export const churchSchema = z.object({
  nome: obrigatorio(120, "Nome").min(2, "Nome curto demais"),
  sigla: texto(10),
  cnpj: z
    .string()
    .trim()
    .refine((v) => v === "" || cnpjValido(v), "CNPJ inválido"),
  pastor: texto(120),
  telefone,
  email,
  endereco: enderecoSchema,
  ...pino,
})

export const filialSchema = z.object({
  nome: obrigatorio(100, "Nome da filial"),
  dirigente: texto(120),
  telefone,
  endereco: enderecoSchema,
  ...pino,
})

export const whatsappSchema = z
  .object({
    conectado: z.boolean(),
    numero: telefone.optional(),
    diasAntecedencia: z.number().int().min(0).max(30),
    mensagemAniversario: obrigatorio(1000, "Mensagem"),
    envioAutomatico: z.boolean(),
  })
  .partial()

export const roleSchema = z.enum(["admin", "secretaria", "tesouraria", "pastor", "lider"], "Função inválida")

export const inviteSchema = z
  .object({
    nome: obrigatorio(120, "Nome"),
    email: z.email("E-mail inválido").max(254),
    papel: roleSchema,
    memberId: id.optional(),
    /** Nome da filial a que o acesso fica restrito; vazio = igreja toda. */
    congregacao: opcional(100),
  })
  .refine((u) => u.papel !== "lider" || u.memberId, {
    path: ["memberId"],
    message: "Escolha o cadastro de membro do líder",
  })

export const updateUserSchema = z
  .object({ papel: roleSchema, ativo: z.boolean(), memberId: id.nullable(), congregacao: z.string().trim().max(100).nullable() })
  .partial()

export const idSchema = id

export type MemberInput = z.input<typeof memberSchema>
export type FieldErrors = Record<string, string>

/** Converte os erros do Zod em `{ "endereco.cep": "CEP inválido" }`, um por campo. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_"
    out[key] ??= issue.message
  }
  return out
}

/** Valida no navegador. Devolve os erros por campo, ou `null` se estiver tudo certo. */
export function check<S extends z.ZodType>(schema: S, value: unknown): FieldErrors | null {
  const r = schema.safeParse(value)
  return r.success ? null : fieldErrors(r.error)
}
