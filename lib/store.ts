"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import {
  seedCertificates,
  seedChurch,
  seedEvents,
  seedMembers,
  seedTransactions,
  seedUsers,
  seedVisits,
  seedWhatsApp,
} from "./seed"
import type {
  AppUser,
  Church,
  ChurchEvent,
  IssuedCertificate,
  Member,
  Transaction,
  Visit,
  WhatsAppSettings,
} from "./types"

export const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

interface AppState {
  church: Church
  members: Member[]
  visits: Visit[]
  transactions: Transaction[]
  events: ChurchEvent[]
  certificates: IssuedCertificate[]
  users: AppUser[]
  whatsapp: WhatsAppSettings

  updateChurch: (church: Partial<Church>) => void

  addMember: (m: Omit<Member, "id">) => Member
  addMembers: (ms: Omit<Member, "id">[]) => number
  updateMember: (id: string, m: Partial<Member>) => void
  removeMember: (id: string) => void

  addVisit: (v: Omit<Visit, "id">) => void
  removeVisit: (id: string) => void

  addTransaction: (t: Omit<Transaction, "id">) => void
  removeTransaction: (id: string) => void

  addEvent: (e: Omit<ChurchEvent, "id">) => void
  removeEvent: (id: string) => void

  addCertificates: (cs: Omit<IssuedCertificate, "id">[]) => void

  addUser: (u: Omit<AppUser, "id">) => void
  updateUser: (id: string, u: Partial<AppUser>) => void
  removeUser: (id: string) => void

  updateWhatsApp: (w: Partial<WhatsAppSettings>) => void
  resetDemo: () => void
}

const initialData = () => ({
  church: seedChurch,
  members: seedMembers,
  visits: seedVisits,
  transactions: seedTransactions,
  events: seedEvents,
  certificates: seedCertificates,
  users: seedUsers,
  whatsapp: seedWhatsApp,
})

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      ...initialData(),

      updateChurch: (church) => set((s) => ({ church: { ...s.church, ...church } })),

      addMember: (m) => {
        const member = { ...m, id: uid("m") }
        set((s) => ({ members: [member, ...s.members] }))
        return member
      },
      addMembers: (ms) => {
        set((s) => ({ members: [...ms.map((m) => ({ ...m, id: uid("m") })), ...s.members] }))
        return ms.length
      },
      updateMember: (id, m) =>
        set((s) => ({ members: s.members.map((x) => (x.id === id ? { ...x, ...m } : x)) })),
      removeMember: (id) =>
        set((s) => ({
          members: s.members.filter((x) => x.id !== id),
          visits: s.visits.filter((v) => v.membroId !== id),
        })),

      addVisit: (v) => set((s) => ({ visits: [{ ...v, id: uid("v") }, ...s.visits].sort((a, b) => b.data.localeCompare(a.data)) })),
      removeVisit: (id) => set((s) => ({ visits: s.visits.filter((v) => v.id !== id) })),

      addTransaction: (t) =>
        set((s) => ({ transactions: [{ ...t, id: uid("t") }, ...s.transactions].sort((a, b) => b.data.localeCompare(a.data)) })),
      removeTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      addEvent: (e) =>
        set((s) => ({
          events: [...s.events, { ...e, id: uid("e") }].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)),
        })),
      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      addCertificates: (cs) =>
        set((s) => ({ certificates: [...cs.map((c) => ({ ...c, id: uid("c") })), ...s.certificates] })),

      addUser: (u) => set((s) => ({ users: [...s.users, { ...u, id: uid("u") }] })),
      updateUser: (id, u) => set((s) => ({ users: s.users.map((x) => (x.id === id ? { ...x, ...u } : x)) })),
      removeUser: (id) => set((s) => ({ users: s.users.filter((x) => x.id !== id) })),

      updateWhatsApp: (w) => set((s) => ({ whatsapp: { ...s.whatsapp, ...w } })),
      resetDemo: () => set(initialData()),
    }),
    {
      name: "rebanho-demo",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
)

export const useMember = (id: string) => useApp((s) => s.members.find((m) => m.id === id))
