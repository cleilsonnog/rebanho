import "dotenv/config"
import { defineConfig, env } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // A CLI (migrations) usa a conexão direta; o app usa a pooled (DATABASE_URL).
  datasource: {
    url: env("DIRECT_URL"),
  },
})
