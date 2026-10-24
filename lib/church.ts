import "server-only"

import { cache } from "react"
import { clerkClient } from "@clerk/nextjs/server"

import { db } from "./db"

/** Devolve a igreja ligada à organização do Clerk, criando o registro no primeiro acesso. */
export const ensureChurch = cache(async (orgId: string) => {
  const existing = await db.church.findUnique({ where: { clerkOrgId: orgId } })
  if (existing) return existing

  const org = await (await clerkClient()).organizations.getOrganization({ organizationId: orgId })
  return db.church.upsert({
    where: { clerkOrgId: orgId },
    create: { clerkOrgId: orgId, nome: org.name },
    update: {},
  })
})
