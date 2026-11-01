import "server-only"

import { db } from "./db"
import { contaLogada } from "./login"

// Painel do dono da plataforma (/admin): todas as igrejas do Rebanho, para cuidar do negócio (clones, cadastros
// abandonados, bloqueios). Quem é dono vem da variável PLATFORM_ADMIN_EMAILS (e-mails separados por vírgula),
// comparada com os e-mails verificados da conta logada no Clerk. Sem a variável, ninguém é dono.

/** E-mail de dono da plataforma da conta logada, ou `null`. */
export async function donoDaPlataforma() {
  const donos = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (donos.length === 0) return null
  const conta = await contaLogada()
  return conta?.emails.map((e) => e.toLowerCase()).find((e) => donos.includes(e)) ?? null
}

/** "Igreja Batista Esperança" e "igreja batista esperanca" viram a mesma chave, para achar possíveis clones. */
const chaveNome = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

export async function listarIgrejas() {
  const igrejas = await db.church.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true, users: true } },
      users: { where: { papel: "admin" }, select: { nome: true, email: true }, orderBy: { createdAt: "asc" } },
    },
  })
  const porNome = new Map<string, number>()
  for (const i of igrejas) porNome.set(chaveNome(i.nome), (porNome.get(chaveNome(i.nome)) ?? 0) + 1)
  return igrejas.map((i) => ({
    id: i.id,
    nome: i.nome,
    cidade: [i.cidade, i.uf.trim()].filter(Boolean).join("/"),
    cnpj: i.cnpj,
    criadaEm: i.createdAt.toISOString(),
    membros: i._count.members,
    equipe: i._count.users,
    admins: i.users,
    bloqueada: i.bloqueada,
    bloqueioMotivo: i.bloqueioMotivo,
    /** Outra igreja com o mesmo nome (sem acento e maiúsculas): pode ser clone, ou só uma igreja homônima. */
    nomeRepetido: (porNome.get(chaveNome(i.nome)) ?? 0) > 1,
  }))
}

export type IgrejaDaPlataforma = Awaited<ReturnType<typeof listarIgrejas>>[number]

export const ultimasAcoes = () => db.platformLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 })
