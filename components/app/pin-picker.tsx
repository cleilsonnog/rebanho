"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Loader2, LocateFixed } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { geocodeAddress } from "@/lib/actions/cells"
import type { Endereco } from "@/lib/types"

const LocationPicker = dynamic(() => import("@/components/app/cells-map").then((m) => m.LocationPicker), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>,
})

/**
 * Mapa para conferir e ajustar o pino de um prédio (igreja, filial). "Localizar endereço" busca a posição;
 * clicar no mapa ou arrastar o pino corrige. Sem pino (0/0), o servidor localiza ao salvar.
 */
export function PinPicker({
  endereco,
  lat,
  lng,
  onChange,
  showChurch,
}: {
  endereco: Endereco
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
  showChurch?: boolean
}) {
  const [buscando, setBuscando] = React.useState(false)

  async function localizar() {
    setBuscando(true)
    try {
      const r = await geocodeAddress(endereco)
      if (!r.ok) return toast.error(r.error)
      onChange(r.data.lat, r.data.lng)
      toast.success(`Posição encontrada pelo ${r.data.precisao}. Confira e arraste o pino se precisar.`)
    } catch {
      toast.error("Sem conexão com o servidor. Tente de novo.")
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Confira o pino. Clique no mapa ou arraste para o lugar certo.</p>
        <Button type="button" variant="outline" size="sm" onClick={localizar} disabled={buscando}>
          {buscando ? <Loader2 className="animate-spin" /> : <LocateFixed />} Localizar endereço
        </Button>
      </div>
      <div className="h-64 overflow-hidden rounded-lg border">
        <LocationPicker lat={lat} lng={lng} onChange={onChange} showChurch={showChurch} pinoIgreja />
      </div>
    </div>
  )
}
