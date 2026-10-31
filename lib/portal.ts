import "server-only"

import type { z } from "zod"

import type { ActionResult } from "./action"
import { ActionError } from "./church"
import { db } from "./db"
import { cellInclude, loadFiliais, toCertificate, toChurch, toEvent, toISO, toMember } from "./data"
import { age } from "./format"
import { loginDoPortal } from "./portal-login"
import { limitar } from "./rate-limit"
import { fieldErrors } from "./validations"
import type { Church, ChurchEvent, IssuedCertificate, Member, Parentesco, SituacaoAluno } from "./types"

// Portal do membro (/membro). O membro é um usuário comum do Clerk, fora da organização da igreja (o Clerk
// limita as pessoas por organização). Quem ele é sai do e-mail verificado no Clerk, comparado a cada página com
// o e-mail dos cadastros com o portal liberado: a secretaria corta o acesso desligando o portal ou trocando o e-mail.
//
// Quem a conta vê (decidido em 31/10/2026):
// - os cadastros com esse e-mail, desde que sejam da mesma família (casal com um e-mail só vê os dois);
// - os filhos menores de 18 anos da família, se a conta for de um responsável ou cônjuge;
// - nada mais. Cônjuge com e-mail próprio vê só a si mesmo (e os filhos menores).

export type Pessoa = { id: string; nome: string; parentesco?: Parentesco }

export type Acesso =
  | { tipo: "sem-acesso" }
  /** O mesmo e-mail está em cadastros que não são da mesma família: a secretaria precisa corrigir. */
  | { tipo: "conflito"; igreja: string }
  /** O e-mail tem portal em mais de uma igreja: a pessoa escolhe qual abrir. */
  | { tipo: "escolher"; igrejas: { id: string; nome: string }[] }
  | { tipo: "ok"; churchId: string; igreja: string; visiveis: Pessoa[] }

const PAIS: Parentesco[] = ["responsavel", "conjuge"]

/** Resolve o acesso de quem tem esses e-mails. `igrejaId` escolhe a igreja quando há mais de uma. */
export async function resolverAcesso(emails: string[], igrejaId?: string): Promise<Acesso> {
  const lista = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
  if (lista.length === 0) return { tipo: "sem-acesso" }

  const contas = await db.member.findMany({
    where: { portal: true, status: { not: "transferido" }, OR: lista.map((e) => ({ email: { equals: e, mode: "insensitive" as const } })) },
    select: { id: true, nome: true, churchId: true, familyId: true, parentesco: true, church: { select: { nome: true } } },
    orderBy: { nome: "asc" },
  })
  const igrejas = [...new Map(contas.map((c) => [c.churchId, { id: c.churchId, nome: c.church.nome }])).values()]
  if (igrejas.length === 0) return { tipo: "sem-acesso" }
  const igreja = igrejas.length === 1 ? igrejas[0] : igrejas.find((i) => i.id === igrejaId)
  if (!igreja) return { tipo: "escolher", igrejas }

  const daIgreja = contas.filter((c) => c.churchId === igreja.id)
  const familia = daIgreja[0].familyId
  if (daIgreja.length > 1 && (!familia || daIgreja.some((c) => c.familyId !== familia))) return { tipo: "conflito", igreja: igreja.nome }

  const visiveis: Pessoa[] = daIgreja.map((c) => ({ id: c.id, nome: c.nome, parentesco: c.parentesco ?? undefined }))
  if (familia && daIgreja.some((c) => c.parentesco && PAIS.includes(c.parentesco))) {
    const filhos = await db.member.findMany({
      where: { churchId: igreja.id, familyId: familia, parentesco: "filho", status: { not: "transferido" }, id: { notIn: visiveis.map((v) => v.id) } },
      select: { id: true, nome: true, nascimento: true },
      orderBy: { nascimento: "asc" },
    })
    for (const f of filhos) if (age(toISO(f.nascimento)) < 18) visiveis.push({ id: f.id, nome: f.nome, parentesco: "filho" })
  }
  return { tipo: "ok", churchId: igreja.id, igreja: igreja.nome, visiveis }
}

/**
 * Server Action do portal (o membro não é usuário da igreja, então não passa pelo `secureAction`). Confere, nesta
 * ordem: login, rate limit, acesso pelo e-mail, entrada válida e que `membroId` é uma das pessoas que a conta vê.
 */
export async function portalAction<S extends z.ZodType<{ membroId: string }>, T>(
  schema: S,
  input: unknown,
  fn: (data: z.output<S>, ctx: { churchId: string; pessoa: Pessoa }) => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const login = await loginDoPortal()
    if (!login) return { ok: false, error: "Sua sessão expirou. Entre novamente." }
    await limitar("portal", login.userId)
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      const errors = fieldErrors(parsed.error)
      return { ok: false, error: Object.values(errors)[0] ?? "Dados inválidos.", fieldErrors: errors }
    }
    const igreja = (input as { igrejaId?: string }).igrejaId
    const acesso = await resolverAcesso(login.emails, igreja)
    const pessoa = acesso.tipo === "ok" ? acesso.visiveis.find((v) => v.id === parsed.data.membroId) : undefined
    if (acesso.tipo !== "ok" || !pessoa) return { ok: false, error: "Você não tem acesso a esse cadastro." }
    return { ok: true, data: await fn(parsed.data, { churchId: acesso.churchId, pessoa }) }
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message }
    console.error("[portalAction]", e)
    return { ok: false, error: "Não foi possível concluir. Tente de novo." }
  }
}

export interface PortalData {
  church: Church
  membro: Member
  celula?: { nome: string; diaSemana?: number; horario: string; endereco: string; lideres: string[]; reunioes: number; presencas: number }
  escolas: { turmaId: string; escola: string; turma: string; horario: string; situacao: SituacaoAluno; concluidoEm?: string; aulas: number; presencas: number }[]
  certificados: IssuedCertificate[]
  eventos: ChurchEvent[]
  /** Correção que o membro pediu e a secretaria ainda não resolveu. */
  correcaoPendente?: { criadoEm: string }
  /** Só se a igreja ligou: nome e dia de quem faz aniversário neste mês (ativos). */
  aniversariantes?: { nome: string; dia: number }[]
  /** Só se a igreja ligou: nomes de quem é da mesma célula. */
  colegas?: string[]
}

/** "Maria Souza" a partir de "Maria Aparecida Souza": primeiro e último nome. */
const nomeCurto = (nome: string) => {
  const p = nome.trim().split(/\s+/)
  return p.length > 1 ? `${p[0]} ${p.at(-1)}` : p[0]
}

/**
 * Dados de UMA pessoa para o portal. Quem chama já conferiu que ela está em `visiveis`. Dos outros membros só
 * saem nomes de líderes de célula; nada de financeiro, visitas, endereço ou contato de outras pessoas.
 */
export async function carregarPortal(churchId: string, membroId: string): Promise<PortalData> {
  const umAnoAtras = new Date(Date.now() - 365 * 86_400_000)
  const hoje = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)
  const [church, m] = await Promise.all([
    db.church.findUniqueOrThrow({ where: { id: churchId } }),
    db.member.findFirstOrThrow({
      where: { id: membroId, churchId },
      include: {
        congregation: { select: { nome: true } },
        cell: { include: { ...cellInclude, leaders: { where: { funcao: { in: ["lider", "colider"] } }, include: { member: { select: { nome: true } } } } } },
        enrollments: { include: { class: { include: { school: true, lessons: { include: { presencas: { where: { memberId: membroId } } } } } } } },
        certificates: { orderBy: { emitidoEm: "desc" } },
        correcoes: { where: { status: "pendente" }, take: 1 },
      },
    }),
  ])
  const mes = new Date().getUTCMonth()
  const [filiais, reunioes, eventos, ativos, colegas] = await Promise.all([
    loadFiliais(church),
    m.cellId
      ? db.cellMeeting.findMany({ where: { cellId: m.cellId, data: { gte: umAnoAtras } }, include: { presencas: { where: { memberId: membroId } } } })
      : [],
    db.event.findMany({ where: { churchId, data: { gte: hoje } }, orderBy: [{ data: "asc" }, { hora: "asc" }], take: 8 }),
    church.portalAniversariantes ? db.member.findMany({ where: { churchId, status: "ativo" }, select: { nome: true, nascimento: true } }) : [],
    church.portalColegasCelula && m.cellId
      ? db.member.findMany({ where: { cellId: m.cellId, id: { not: m.id }, status: { not: "transferido" } }, select: { nome: true }, orderBy: { nome: "asc" } })
      : [],
  ])

  const c = m.cell
  return {
    church: toChurch(church, filiais),
    membro: toMember(m),
    celula: c
      ? {
          nome: c.nome,
          diaSemana: c.diaSemana ?? undefined,
          horario: c.horario,
          endereco: [c.rua && `${c.rua}, ${c.numero}`, c.bairro].filter(Boolean).join(" · "),
          lideres: [...new Set(c.leaders.map((l) => l.member.nome))],
          reunioes: reunioes.length,
          presencas: reunioes.filter((r) => r.presencas.length > 0).length,
        }
      : undefined,
    escolas: m.enrollments.map((e) => ({
      turmaId: e.classId,
      escola: e.class.school.nome,
      turma: e.class.nome,
      horario: [e.class.horario, e.class.local].filter(Boolean).join(" · "),
      situacao: e.situacao,
      concluidoEm: e.concluidoEm ? toISO(e.concluidoEm) : undefined,
      aulas: e.class.lessons.length,
      presencas: e.class.lessons.filter((l) => l.presencas.length > 0).length,
    })),
    certificados: m.certificates.map(toCertificate),
    eventos: eventos.map(toEvent),
    correcaoPendente: m.correcoes[0] ? { criadoEm: m.correcoes[0].createdAt.toISOString() } : undefined,
    aniversariantes: church.portalAniversariantes
      ? ativos
          .filter((a) => a.nascimento.getUTCMonth() === mes)
          .map((a) => ({ nome: nomeCurto(a.nome), dia: a.nascimento.getUTCDate() }))
          .sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome, "pt-BR"))
      : undefined,
    colegas: church.portalColegasCelula && m.cellId ? colegas.map((c) => nomeCurto(c.nome)) : undefined,
  }
}
