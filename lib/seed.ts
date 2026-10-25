import type {
  AppUser,
  Church,
  ChurchEvent,
  IssuedCertificate,
  Member,
  Transaction,
  Visit,
  WhatsAppSettings,
} from "./types"

// PRNG determinístico para que os dados de exemplo sejam sempre os mesmos.
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20261024)
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]
const between = (min: number, max: number) => min + rand() * (max - min)
const int = (min: number, max: number) => Math.floor(between(min, max + 1))
const pad = (n: number) => String(n).padStart(2, "0")
const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
/** Limita à data de "hoje" da demonstração sem mudar a sequência do gerador aleatório. */
const ateHoje = (iso: string) => (iso > "2026-10-24" ? "2026-10-24" : iso)

const nomesM = [
  "João", "Pedro", "Lucas", "Mateus", "Gabriel", "Rafael", "Daniel", "Samuel", "Davi", "Tiago",
  "André", "Paulo", "Marcos", "Felipe", "Bruno", "Thiago", "Eduardo", "Ricardo", "Josué", "Elias",
  "Caleb", "Natanael", "Jonas", "Vinícius", "Gustavo", "Leandro", "Rodrigo", "Fábio", "Wesley", "Henrique",
] as const
const nomesF = [
  "Maria", "Ana", "Beatriz", "Débora", "Raquel", "Sara", "Ester", "Rebeca", "Priscila", "Lídia",
  "Juliana", "Fernanda", "Camila", "Larissa", "Patrícia", "Aline", "Letícia", "Mariana", "Talita", "Noemi",
  "Rute", "Isabela", "Gabriela", "Vanessa", "Cristina", "Simone", "Eliane", "Joana", "Marta", "Tatiane",
] as const
const sobrenomes = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes",
  "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa",
  "Rocha", "Dias", "Nascimento", "Andrade", "Moreira", "Nunes", "Mendes", "Freitas", "Cardoso", "Teixeira",
] as const

// Bairros de Goiânia com coordenadas aproximadas do centro de cada um.
export const BAIRROS = [
  { nome: "Setor Bueno", lat: -16.7063, lng: -49.2725 },
  { nome: "Setor Oeste", lat: -16.6814, lng: -49.2696 },
  { nome: "Jardim América", lat: -16.7158, lng: -49.2847 },
  { nome: "Setor Marista", lat: -16.7006, lng: -49.2575 },
  { nome: "Vila Nova", lat: -16.6714, lng: -49.2389 },
  { nome: "Setor Campinas", lat: -16.6683, lng: -49.2939 },
  { nome: "Jardim Goiás", lat: -16.7064, lng: -49.2381 },
  { nome: "Setor Universitário", lat: -16.6806, lng: -49.2442 },
  { nome: "Parque Amazônia", lat: -16.7397, lng: -49.2853 },
  { nome: "Setor Pedro Ludovico", lat: -16.7208, lng: -49.2603 },
] as const
const ruas = ["Rua T-", "Av. T-", "Rua C-", "Rua 1", "Av. República do Líbano", "Rua 9", "Av. 85", "Rua S-"] as const

export const CONGREGACOES = ["Sede", "Congregação Leste", "Congregação Sul"] as const
export const CARGOS = ["Membro", "Diácono", "Diaconisa", "Presbítero", "Evangelista", "Pastor", "Missionária", "Líder de Jovens", "Professor EBD"] as const
export const MINISTERIOS = ["Louvor", "Infantil", "Jovens", "Intercessão", "Recepção", "Mídia", "Ação Social", "Casais", "Mulheres", "Homens", "EBD"] as const
export const CATEGORIAS_ENTRADA = ["Dízimo", "Oferta", "Campanha", "Missões", "Doação"] as const
export const CATEGORIAS_SAIDA = ["Aluguel", "Energia", "Água", "Internet", "Manutenção", "Ação Social", "Missões", "Material", "Salários"] as const
export const MOTIVOS_VISITA = ["Acompanhamento", "Enfermidade", "Visitante novo", "Membro afastado", "Aconselhamento", "Nascimento", "Luto"] as const
export const TIPOS_CERTIFICADO = ["Batismo", "Apresentação de criança", "Conclusão de curso", "Participação em congresso", "Membresia", "Casamento"] as const

const TODAY = new Date("2026-10-24T12:00:00")

function genMembers(n: number): Member[] {
  const members: Member[] = []
  for (let i = 0; i < n; i++) {
    const sexo = rand() < 0.53 ? "F" : "M"
    const nome = `${sexo === "F" ? pick(nomesF) : pick(nomesM)} ${pick(sobrenomes)} ${pick(sobrenomes)}`
    const idade = rand() < 0.18 ? int(4, 17) : rand() < 0.6 ? int(18, 45) : int(46, 85)
    const nascimento = isoDate(TODAY.getFullYear() - idade, int(1, 12), int(1, 28))
    const bairro = pick(BAIRROS)
    const statusRoll = rand()
    const status =
      statusRoll < 0.78 ? "ativo" : statusRoll < 0.88 ? "afastado" : statusRoll < 0.97 ? "visitante" : "transferido"
    const batizado = status !== "visitante" && idade >= 12 && rand() < 0.85
    const anoMembro = int(2004, 2026)
    const first = nome.split(" ")[0].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    const cargo = idade < 18 ? "Membro" : rand() < 0.72 ? "Membro" : pick(CARGOS.slice(1))
    const ministerios = Array.from(new Set(Array.from({ length: int(0, 2) }, () => pick(MINISTERIOS))))
    members.push({
      id: `m${String(i + 1).padStart(4, "0")}`,
      nome,
      sexo,
      nascimento,
      telefone: `(62) 9${int(8000, 9999)}-${int(1000, 9999)}`,
      email: `${first}.${int(10, 99)}@email.com`,
      estadoCivil: idade < 22 ? "solteiro" : pick(["solteiro", "casado", "casado", "casado", "divorciado", "viuvo"] as const),
      endereco: {
        rua: `${pick(ruas)}${int(1, 60)}`,
        numero: String(int(10, 1500)),
        bairro: bairro.nome,
        cidade: "Goiânia",
        uf: "GO",
        cep: `74${int(100, 899)}-${int(100, 999)}`,
      },
      lat: bairro.lat + between(-0.008, 0.008),
      lng: bairro.lng + between(-0.008, 0.008),
      congregacao: rand() < 0.6 ? CONGREGACOES[0] : pick(CONGREGACOES.slice(1)),
      cargo,
      ministerios: status === "visitante" ? [] : ministerios,
      status,
      batizado,
      dataBatismo: batizado ? isoDate(Math.max(anoMembro, TODAY.getFullYear() - idade + 12), int(1, 12), int(1, 28)) : undefined,
      membroDesde: ateHoje(status === "visitante" ? isoDate(2026, int(8, 10), int(1, 24)) : isoDate(anoMembro, int(1, 12), int(1, 28))),
    })
  }
  return members
}

export const seedMembers = genMembers(148)

const pastores = ["Pr. Samuel Rocha", "Pra. Débora Rocha", "Pb. André Lima", "Ev. Paulo Mendes"]

function genVisits(): Visit[] {
  const visits: Visit[] = []
  const candidatos = seedMembers.filter((m) => m.status !== "transferido")
  const notas = [
    "Família recebeu bem a visita. Oramos juntos e combinamos acompanhamento no próximo mês.",
    "Irmão em recuperação de cirurgia. Precisa de ajuda com transporte para os cultos.",
    "Visitante veio por convite de vizinho. Demonstrou interesse no grupo de casais.",
    "Conversamos sobre o afastamento. Pediu oração pela situação no trabalho.",
    "Levamos cesta básica pela ação social. Mãe pediu matrícula das crianças no ministério infantil.",
    "Aconselhamento conjugal. Próximo encontro com o casal na igreja.",
  ]
  for (let i = 0; i < 46; i++) {
    const m = pick(candidatos)
    const month = int(3, 10)
    const day = month === 10 ? int(1, 23) : int(1, 28)
    const temProxima = rand() < 0.55
    visits.push({
      id: `v${i + 1}`,
      membroId: m.id,
      data: isoDate(2026, month, day),
      responsavel: pick(pastores),
      motivo: m.status === "visitante" ? "Visitante novo" : m.status === "afastado" ? "Membro afastado" : pick(MOTIVOS_VISITA),
      notas: pick(notas),
      proximaVisita: temProxima ? isoDate(2026, Math.min(12, month + 1), int(1, 28)) : undefined,
    })
  }
  return visits.sort((a, b) => b.data.localeCompare(a.data))
}

function genTransactions(): Transaction[] {
  const tx: Transaction[] = []
  let id = 1
  const dizimistas = seedMembers.filter((m) => m.status === "ativo" && rand() < 0.5)
  for (let month = 1; month <= 10; month++) {
    const lastDay = month === 10 ? 24 : 28
    for (const m of dizimistas) {
      if (rand() < 0.8)
        tx.push({
          id: `t${id++}`,
          tipo: "entrada",
          categoria: "Dízimo",
          valor: Math.round(between(80, 900)),
          data: isoDate(2026, month, int(1, lastDay)),
          descricao: "Dízimo mensal",
          membroId: m.id,
          formaPagamento: pick(["pix", "pix", "pix", "dinheiro", "transferencia"] as const),
        })
    }
    for (let k = 0; k < 8; k++)
      tx.push({
        id: `t${id++}`,
        tipo: "entrada",
        categoria: k < 6 ? "Oferta" : pick(["Campanha", "Missões", "Doação"] as const),
        valor: Math.round(between(300, 2400)),
        data: isoDate(2026, month, Math.min(lastDay, 3 + k * 3)),
        descricao: k < 6 ? "Oferta do culto de domingo" : "Campanha de construção do anexo",
        formaPagamento: pick(["pix", "dinheiro", "cartao"] as const),
      })
    const fixos: [string, number, string][] = [
      ["Aluguel", 3800, "Aluguel do templo"],
      ["Energia", between(650, 1100), "Conta de energia"],
      ["Água", between(180, 320), "Conta de água"],
      ["Internet", 189.9, "Internet e telefone"],
      ["Salários", 4200, "Prebenda pastoral e zeladoria"],
    ]
    for (const [categoria, valor, descricao] of fixos)
      tx.push({
        id: `t${id++}`,
        tipo: "saida",
        categoria,
        valor: Math.round(valor * 100) / 100,
        data: isoDate(2026, month, int(5, Math.min(lastDay, 12))),
        descricao,
        formaPagamento: pick(["boleto", "transferencia", "pix"] as const),
      })
    for (let k = 0; k < int(2, 4); k++)
      tx.push({
        id: `t${id++}`,
        tipo: "saida",
        categoria: pick(["Manutenção", "Ação Social", "Missões", "Material"] as const),
        valor: Math.round(between(120, 1800)),
        data: isoDate(2026, month, int(1, lastDay)),
        descricao: pick(["Compra de material de limpeza", "Cestas básicas", "Oferta missionária", "Reparo no som", "Material da EBD"]),
        formaPagamento: pick(["pix", "cartao", "dinheiro"] as const),
      })
  }
  return tx.sort((a, b) => b.data.localeCompare(a.data))
}

function genEvents(): ChurchEvent[] {
  const ev: ChurchEvent[] = []
  let id = 1
  // Cultos recorrentes de outubro a dezembro.
  for (let d = new Date("2026-10-01T12:00:00"); d <= new Date("2026-12-31T12:00:00"); d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    if (d.getDay() === 0) {
      ev.push({ id: `e${id++}`, titulo: "Escola Bíblica Dominical", data: iso, hora: "09:00", local: "Sede", tipo: "curso" })
      ev.push({ id: `e${id++}`, titulo: "Culto de Celebração", data: iso, hora: "19:00", local: "Sede", tipo: "culto" })
    }
    if (d.getDay() === 3) ev.push({ id: `e${id++}`, titulo: "Culto de Oração", data: iso, hora: "19:30", local: "Sede", tipo: "culto" })
    if (d.getDay() === 6 && d.getDate() <= 7)
      ev.push({ id: `e${id++}`, titulo: "Reunião de Liderança", data: iso, hora: "16:00", local: "Sala 2", tipo: "reuniao" })
  }
  ev.push(
    { id: `e${id++}`, titulo: "Ensaio do louvor", data: "2026-10-30", hora: "19:30", local: "Sede", tipo: "ensaio" },
    { id: `e${id++}`, titulo: "Congresso de Jovens", data: "2026-11-14", hora: "18:00", local: "Ginásio Municipal", tipo: "evento", descricao: "Tema: Raízes. Inscrições com a liderança de jovens." },
    { id: `e${id++}`, titulo: "Batismo nas águas", data: "2026-11-22", hora: "10:00", local: "Chácara Betel", tipo: "evento" },
    { id: `e${id++}`, titulo: "Cantata de Natal", data: "2026-12-20", hora: "19:00", local: "Sede", tipo: "evento" },
    { id: `e${id++}`, titulo: "Curso de Batismo — aula 3", data: "2026-10-27", hora: "20:00", local: "Sala 1", tipo: "curso" }
  )
  return ev.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
}

export const seedVisits = genVisits()
export const seedTransactions = genTransactions()
export const seedEvents = genEvents()

export const seedCertificates: IssuedCertificate[] = seedMembers
  .filter((m) => m.batizado)
  .slice(0, 12)
  .map((m, i) => ({
    id: `c${i + 1}`,
    membroId: m.id,
    tipo: i % 3 === 0 ? "Conclusão de curso" : "Batismo",
    estilo: (["classico", "moderno", "minimalista"] as const)[i % 3],
    emitidoEm: isoDate(2026, int(5, 10), int(1, 20)),
    detalhe: i % 3 === 0 ? "Curso de Discipulado — 12 aulas" : "Batismo nas águas",
  }))

export const seedChurch: Church = {
  nome: "Igreja Comunidade Monte Hermom",
  sigla: "MH",
  cnpj: "12.345.678/0001-95",
  pastor: "Pr. Samuel Rocha",
  telefone: "(62) 3333-4455",
  email: "secretaria@montehermom.org",
  endereco: { rua: "Av. T-63", numero: "1200", bairro: "Setor Bueno", cidade: "Goiânia", uf: "GO", cep: "74230-100" },
  congregacoes: [...CONGREGACOES],
  filiais: [],
  lat: -16.7063,
  lng: -49.2725,
}

export const seedUsers: AppUser[] = [
  { id: "u1", nome: "Samuel Rocha", email: "pastor@montehermom.org", papel: "admin", ativo: true, pendente: false },
  { id: "u2", nome: "Lídia Carvalho", email: "secretaria@montehermom.org", papel: "secretaria", ativo: true, pendente: false },
  { id: "u3", nome: "Marcos Teixeira", email: "tesouraria@montehermom.org", papel: "tesouraria", ativo: true, pendente: false },
  { id: "u4", nome: "Débora Rocha", email: "debora@montehermom.org", papel: "pastor", ativo: true, pendente: false },
  { id: "u5", nome: "Caleb Nunes", email: "jovens@montehermom.org", papel: "lider", ativo: false, pendente: false },
]

export const seedWhatsApp: WhatsAppSettings = {
  conectado: false,
  diasAntecedencia: 1,
  envioAutomatico: true,
  mensagemAniversario:
    "Olá, {nome}! 🎉 A {igreja} celebra a sua vida hoje. Que o Senhor te abençoe e te guarde neste novo ano. Feliz aniversário!",
}
