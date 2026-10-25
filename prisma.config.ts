import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // A CLI (migrations) usa a conexão direta; o app usa a pooled (DATABASE_URL).
  // Opcional aqui: o `prisma generate` do `npm install` (inclusive na Vercel) não precisa de banco.
  datasource: {
    url: process.env.DIRECT_URL,
  },
})
