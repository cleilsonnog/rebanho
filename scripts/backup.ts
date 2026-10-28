// Faz o backup semanal na hora, a partir do computador: npm run db:backup
import "dotenv/config"

import { backupSemanal, MANTER } from "../lib/backup"

backupSemanal()
  .then((r) => {
    console.log(r.criado ? `Backup criado: ${r.criado}` : "O backup de hoje já existia.")
    if (r.removidos.length) console.log(`Removidos (guardamos só os ${MANTER} últimos): ${r.removidos.join(", ")}`)
  })
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
