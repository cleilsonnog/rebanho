"use client"

import * as React from "react"

import { useApp } from "@/lib/store"

// No servidor não há localStorage, então a API `persist` não existe.
const subscribe = (cb: () => void) => useApp.persist?.onFinishHydration(cb) ?? (() => {})
const getSnapshot = () => useApp.persist?.hasHydrated() ?? false
const getServerSnapshot = () => false

/** Reidrata a store persistida no navegador e informa quando terminou. */
export function useHydrated() {
  const hydrated = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  React.useEffect(() => {
    if (!useApp.persist.hasHydrated()) useApp.persist.rehydrate()
  }, [])

  return hydrated
}
