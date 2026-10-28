import "dotenv/config"

import { PrismaNeon } from "@prisma/adapter-neon"

import { insertDemoData } from "../lib/demo"
import { PrismaClient } from "../lib/generated/prisma/client"
import { seedChurch, seedWhatsApp } from "../lib/seed"

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) })

const DEMO_ID = "igreja-demo"

async function main() {
  // Recria a igreja de demonstração do zero (o cascade apaga os dados dela).
  await db.church.deleteMany({ where: { id: DEMO_ID } })

  const { endereco, congregacoes: _c, filiais: _f, logoUrl: _l, ...church } = seedChurch
  await db.church.create({
    data: {
      id: DEMO_ID,
      ...church,
      ...endereco,
      whatsappDiasAntes: seedWhatsApp.diasAntecedencia,
      whatsappAutomatico: seedWhatsApp.envioAutomatico,
      whatsappMensagem: seedWhatsApp.mensagemAniversario,
    },
  })
  await insertDemoData(db, DEMO_ID)

  const where = { churchId: DEMO_ID }
  const counts = await Promise.all([
    db.member.count({ where }),
    db.visit.count({ where }),
    db.transaction.count({ where }),
    db.event.count({ where }),
  ])
  console.log(`Seed ok: ${counts[0]} membros, ${counts[1]} visitas, ${counts[2]} lançamentos, ${counts[3]} eventos`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
