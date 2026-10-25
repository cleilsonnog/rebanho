"use client"

import * as React from "react"
import { createStore, useStore, type StoreApi } from "zustand"

import type { ActionResult } from "./action"
import * as cells from "./actions/cells"
import * as certificates from "./actions/certificates"
import * as church from "./actions/church"
import * as events from "./actions/events"
import * as finance from "./actions/finance"
import * as members from "./actions/members"
import * as users from "./actions/users"
import * as visits from "./actions/visits"
import type { AppData, AppUser, Cell, CellMeeting, Church, ChurchEvent, IssuedCertificate, Member, Transaction, Visit, WhatsAppSettings } from "./types"

type Input<F extends (...args: never[]) => unknown> = Parameters<F>[0]

// A store é só o cache do navegador: começa com os dados que o servidor carregou para a igreja ativa
// e cada alteração passa por uma Server Action (que valida e checa permissão) antes de mudar a tela.
interface AppState extends AppData {
  addMember: (m: Input<typeof members.createMember>) => Promise<ActionResult<Member>>
  addMembers: (ms: Input<typeof members.importMembers>) => Promise<ActionResult<Member[]>>
  updateMember: (id: string, m: Input<typeof members.createMember>) => Promise<ActionResult<Member>>
  removeMember: (id: string) => Promise<ActionResult>

  addVisit: (v: Input<typeof visits.createVisit>) => Promise<ActionResult<Visit>>
  removeVisit: (id: string) => Promise<ActionResult>

  addTransaction: (t: Input<typeof finance.createTransaction>) => Promise<ActionResult<Transaction>>
  removeTransaction: (id: string) => Promise<ActionResult>

  addEvent: (e: Input<typeof events.createEvent>) => Promise<ActionResult<ChurchEvent>>
  removeEvent: (id: string) => Promise<ActionResult>

  addCell: (c: Input<typeof cells.createCell>) => Promise<ActionResult<Cell>>
  updateCell: (id: string, c: Input<typeof cells.createCell>) => Promise<ActionResult<Cell>>
  removeCell: (id: string) => Promise<ActionResult>
  saveCellMeeting: (m: Input<typeof cells.saveCellMeeting>) => Promise<ActionResult<CellMeeting>>
  removeCellMeeting: (id: string) => Promise<ActionResult>

  addCertificates: (c: Input<typeof certificates.issueCertificates>) => Promise<ActionResult<IssuedCertificate[]>>

  updateChurch: (c: Input<typeof church.updateChurch>) => Promise<ActionResult<Church>>
  updateWhatsApp: (w: Input<typeof church.updateWhatsApp>) => Promise<ActionResult<WhatsAppSettings>>
  loadDemoData: () => Promise<ActionResult>

  addUser: (u: Input<typeof users.inviteUser>) => Promise<ActionResult<AppUser>>
  updateUser: (id: string, u: Parameters<typeof users.updateUser>[1]) => Promise<ActionResult<AppUser>>
  removeUser: (id: string) => Promise<ActionResult>
}

/** Aplica o resultado na store só se o servidor aceitou; devolve o resultado para a tela mostrar o erro. */
async function apply<T>(p: Promise<ActionResult<T>>, onOk: (data: T) => void) {
  const r = await p
  if (r.ok) onOk(r.data)
  return r
}

/** Coloca a célula salva na lista; quem entrou nela sai da célula em que estava. */
function putCell(list: Cell[], cell: Cell) {
  const nela = new Set(cell.membroIds)
  const outras = list.filter((c) => c.id !== cell.id).map((c) => ({ ...c, membroIds: c.membroIds.filter((id) => !nela.has(id)) }))
  return [...outras, cell].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
}

const semPessoa = (id: string) => (ids: string[]) => ids.filter((x) => x !== id)

const byDateDesc = <T extends { data: string }>(xs: T[]) => xs.sort((a, b) => b.data.localeCompare(a.data))

function createAppStore(data: AppData) {
  return createStore<AppState>()((set) => ({
    ...data,

    addMember: (m) => apply(members.createMember(m), (member) => set((s) => ({ members: [member, ...s.members] }))),
    addMembers: (ms) => apply(members.importMembers(ms), (novos) => set((s) => ({ members: [...novos, ...s.members] }))),
    updateMember: (id, m) =>
      apply(members.updateMember(id, m), (member) => set((s) => ({ members: s.members.map((x) => (x.id === id ? member : x)) }))),
    removeMember: (id) =>
      apply(members.deleteMember(id), () =>
        set((s) => ({
          members: s.members.filter((x) => x.id !== id),
          visits: s.visits.filter((v) => v.membroId !== id),
          certificates: s.certificates.filter((c) => c.membroId !== id),
          cells: s.cells.map((c) => ({
            ...c,
            lideres: semPessoa(id)(c.lideres),
            colideres: semPessoa(id)(c.colideres),
            anfitrioes: semPessoa(id)(c.anfitrioes),
            membroIds: semPessoa(id)(c.membroIds),
          })),
          cellMeetings: s.cellMeetings.map((r) => ({ ...r, presentes: semPessoa(id)(r.presentes) })),
        }))
      ),

    addVisit: (v) => apply(visits.createVisit(v), (visit) => set((s) => ({ visits: byDateDesc([visit, ...s.visits]) }))),
    removeVisit: (id) => apply(visits.deleteVisit(id), () => set((s) => ({ visits: s.visits.filter((v) => v.id !== id) }))),

    addTransaction: (t) =>
      apply(finance.createTransaction(t), (tr) => set((s) => ({ transactions: byDateDesc([tr, ...s.transactions]) }))),
    removeTransaction: (id) =>
      apply(finance.deleteTransaction(id), () => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }))),

    addEvent: (e) =>
      apply(events.createEvent(e), (ev) =>
        set((s) => ({ events: [...s.events, ev].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)) }))
      ),
    removeEvent: (id) => apply(events.deleteEvent(id), () => set((s) => ({ events: s.events.filter((e) => e.id !== id) }))),

    addCell: (c) => apply(cells.createCell(c), (cell) => set((s) => ({ cells: putCell(s.cells, cell) }))),
    updateCell: (id, c) => apply(cells.updateCell(id, c), (cell) => set((s) => ({ cells: putCell(s.cells, cell) }))),
    removeCell: (id) =>
      apply(cells.deleteCell(id), () =>
        set((s) => ({ cells: s.cells.filter((c) => c.id !== id), cellMeetings: s.cellMeetings.filter((r) => r.celulaId !== id) }))
      ),
    saveCellMeeting: (m) =>
      apply(cells.saveCellMeeting(m), (r) =>
        set((s) => ({ cellMeetings: byDateDesc([r, ...s.cellMeetings.filter((x) => x.id !== r.id)]) }))
      ),
    removeCellMeeting: (id) =>
      apply(cells.deleteCellMeeting(id), () => set((s) => ({ cellMeetings: s.cellMeetings.filter((r) => r.id !== id) }))),

    addCertificates: (c) =>
      apply(certificates.issueCertificates(c), (cs) => set((s) => ({ certificates: [...cs, ...s.certificates] }))),

    updateChurch: (c) => apply(church.updateChurch(c), (ch) => set({ church: ch })),
    updateWhatsApp: (w) => apply(church.updateWhatsApp(w), (whatsapp) => set({ whatsapp })),
    // Depois de trocar os dados a tela recarrega e o servidor manda tudo de novo.
    loadDemoData: () => church.loadDemoData(),

    addUser: (u) => apply(users.inviteUser(u), (user) => set((s) => ({ users: [...s.users, user] }))),
    updateUser: (id, u) =>
      apply(users.updateUser(id, u), (user) => set((s) => ({ users: s.users.map((x) => (x.id === id ? user : x)) }))),
    removeUser: (id) => apply(users.removeUser(id), () => set((s) => ({ users: s.users.filter((x) => x.id !== id) }))),
  }))
}

const StoreContext = React.createContext<StoreApi<AppState> | null>(null)

/** Uma store por renderização: no servidor, uma store global misturaria dados de igrejas diferentes. */
export function AppStoreProvider({ data, children }: { data: AppData; children: React.ReactNode }) {
  const [store] = React.useState(() => createAppStore(data))
  // Quando o servidor manda dados novos (router.refresh), a store acompanha.
  React.useEffect(() => store.setState(data), [store, data])
  return React.createElement(StoreContext.Provider, { value: store }, children)
}

export function useAppStore() {
  const store = React.useContext(StoreContext)
  if (!store) throw new Error("useApp precisa estar dentro de <AppStoreProvider>")
  return store
}

const all = (s: AppState) => s

export function useApp(): AppState
export function useApp<T>(selector: (s: AppState) => T): T
export function useApp<T>(selector?: (s: AppState) => T) {
  return useStore(useAppStore(), selector ?? (all as (s: AppState) => T))
}

export const useMember = (id: string) => useApp((s) => s.members.find((m) => m.id === id))
