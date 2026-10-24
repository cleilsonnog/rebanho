import "server-only"

import { PrismaNeon } from "@prisma/adapter-neon"

import { PrismaClient } from "./generated/prisma/client"

// Reaproveita o client entre recargas do `next dev` para não abrir conexões a cada edição.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
