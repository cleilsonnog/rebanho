import { randomUUID } from "node:crypto"

import type { Prisma } from "./generated/prisma/client"
import { seedCertificates, seedChurch, seedEvents, seedMembers, seedTransactions, seedVisits } from "./seed"

// Sem "server-only" para que o `prisma/seed.ts` (rodado com tsx) também use estas funções.

const date = (iso: string) => new Date(`${iso}T00:00:00Z`)

/** Apaga membros, visitas, lançamentos, eventos, certificados e congregações da igreja. */
export async function clearChurchData(tx: Prisma.TransactionClient, churchId: string) {
  const where = { churchId }
  await tx.visit.deleteMany({ where })
  await tx.certificate.deleteMany({ where })
  await tx.transaction.deleteMany({ where })
  await tx.member.deleteMany({ where })
  await tx.event.deleteMany({ where })
  await tx.congregation.deleteMany({ where })
}

/** Insere os dados de exemplo na igreja, com ids novos para não colidir com os de outra igreja. */
export async function insertDemoData(tx: Prisma.TransactionClient, churchId: string) {
  await tx.congregation.createMany({ data: seedChurch.congregacoes.map((nome) => ({ churchId, nome })) })
  const congs = await tx.congregation.findMany({ where: { churchId } })
  const congId = new Map(congs.map((c) => [c.nome, c.id]))
  const memberId = new Map(seedMembers.map((m) => [m.id, randomUUID()]))

  await tx.member.createMany({
    data: seedMembers.map(({ id, endereco, congregacao, nascimento, dataBatismo, membroDesde, ...m }) => ({
      ...m,
      ...endereco,
      id: memberId.get(id),
      churchId,
      congregationId: congId.get(congregacao),
      nascimento: date(nascimento),
      dataBatismo: dataBatismo ? date(dataBatismo) : null,
      membroDesde: date(membroDesde),
    })),
  })

  await tx.visit.createMany({
    data: seedVisits.map(({ id: _id, membroId, data, proximaVisita, ...v }) => ({
      ...v,
      churchId,
      memberId: memberId.get(membroId)!,
      data: date(data),
      proximaVisita: proximaVisita ? date(proximaVisita) : null,
    })),
  })

  await tx.transaction.createMany({
    data: seedTransactions.map(({ id: _id, membroId, data, ...t }) => ({
      ...t,
      churchId,
      memberId: membroId && memberId.get(membroId),
      data: date(data),
    })),
  })

  await tx.event.createMany({
    data: seedEvents.map(({ id: _id, data, ...e }) => ({ ...e, churchId, data: date(data) })),
  })

  await tx.certificate.createMany({
    data: seedCertificates.map(({ id: _id, membroId, emitidoEm, ...c }) => ({
      ...c,
      churchId,
      memberId: memberId.get(membroId)!,
      emitidoEm: date(emitidoEm),
    })),
  })
}
