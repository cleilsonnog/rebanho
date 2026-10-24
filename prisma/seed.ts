import "dotenv/config"

import { PrismaNeon } from "@prisma/adapter-neon"

import { PrismaClient } from "../lib/generated/prisma/client"
import {
  seedCertificates,
  seedChurch,
  seedEvents,
  seedMembers,
  seedTransactions,
  seedVisits,
  seedWhatsApp,
} from "../lib/seed"

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) })

const DEMO_ID = "igreja-demo"
const date = (iso?: string) => (iso ? new Date(`${iso}T00:00:00Z`) : null)

async function main() {
  // Recria a igreja de demonstração do zero (o cascade apaga os dados dela).
  await db.church.deleteMany({ where: { id: DEMO_ID } })

  const { endereco, congregacoes, ...church } = seedChurch
  await db.church.create({
    data: {
      id: DEMO_ID,
      ...church,
      ...endereco,
      whatsappDiasAntes: seedWhatsApp.diasAntecedencia,
      whatsappAutomatico: seedWhatsApp.envioAutomatico,
      whatsappMensagem: seedWhatsApp.mensagemAniversario,
      congregations: { create: congregacoes.map((nome) => ({ nome })) },
    },
  })
  const congs = await db.congregation.findMany({ where: { churchId: DEMO_ID } })
  const congId = new Map(congs.map((c) => [c.nome, c.id]))

  await db.member.createMany({
    data: seedMembers.map(({ endereco, congregacao, nascimento, dataBatismo, membroDesde, ...m }) => ({
      ...m,
      ...endereco,
      churchId: DEMO_ID,
      congregationId: congId.get(congregacao),
      nascimento: date(nascimento)!,
      dataBatismo: date(dataBatismo),
      membroDesde: date(membroDesde)!,
    })),
  })

  await db.visit.createMany({
    data: seedVisits.map(({ id: _id, membroId, data, proximaVisita, ...v }) => ({
      ...v,
      churchId: DEMO_ID,
      memberId: membroId,
      data: date(data)!,
      proximaVisita: date(proximaVisita),
    })),
  })

  await db.transaction.createMany({
    data: seedTransactions.map(({ id: _id, membroId, data, ...t }) => ({
      ...t,
      churchId: DEMO_ID,
      memberId: membroId,
      data: date(data)!,
    })),
  })

  await db.event.createMany({
    data: seedEvents.map(({ id: _id, data, ...e }) => ({ ...e, churchId: DEMO_ID, data: date(data)! })),
  })

  await db.certificate.createMany({
    data: seedCertificates.map(({ id: _id, membroId, emitidoEm, ...c }) => ({
      ...c,
      churchId: DEMO_ID,
      memberId: membroId,
      emitidoEm: date(emitidoEm)!,
    })),
  })

  const counts = await Promise.all([db.member.count(), db.visit.count(), db.transaction.count(), db.event.count()])
  console.log(`Seed ok: ${counts[0]} membros, ${counts[1]} visitas, ${counts[2]} lançamentos, ${counts[3]} eventos`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
