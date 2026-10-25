"use server"

import type { z } from "zod"

import { secureAction } from "../action"
import { db } from "../db"
import { toDate, toEvent } from "../data"
import { eventSchema, idSchema } from "../validations"

export async function createEvent(input: z.input<typeof eventSchema>) {
  return secureAction("agenda", eventSchema, input, async ({ data, ...e }, { church }) => {
    const row = await db.event.create({ data: { ...e, churchId: church.id, data: toDate(data) } })
    return toEvent(row)
  })
}

export async function deleteEvent(id: string) {
  return secureAction("agenda", idSchema, id, async (id, { church }) => {
    await db.event.delete({ where: { id, churchId: church.id } })
  })
}
