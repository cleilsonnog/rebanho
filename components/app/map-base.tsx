"use client"

import * as React from "react"
import L from "leaflet"
import { Marker, Popup, TileLayer, useMap } from "react-leaflet"

import type { Church } from "@/lib/types"

/** Sem endereço da igreja nem pinos, o mapa mostra o Brasil inteiro. */
export const BRASIL: [number, number] = [-14.235, -51.925]

export const temPosicao = (p: { lat: number; lng: number }) => p.lat !== 0 || p.lng !== 0

/** Onde o mapa abre: na igreja, se ela já foi localizada; senão, no Brasil. */
export const inicio = (church: Church) => ({
  center: temPosicao(church) ? ([church.lat, church.lng] as [number, number]) : BRASIL,
  zoom: temPosicao(church) ? 13 : 4,
})

export const Tiles = () => (
  <TileLayer
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />
)

const igrejaIcon = L.divIcon({
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -30],
  html: `<span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#e8a317;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"><svg style="transform:rotate(45deg)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6M9 5h6M5 22V12l7-4 7 4v10M10 22v-5h4v5"/></svg></span>`,
})

/** Pino da igreja (prédio), em âmbar para se destacar dos membros e das células. */
export function ChurchMarker({ church }: { church: Church }) {
  if (!temPosicao(church)) return null
  return (
    <Marker position={[church.lat, church.lng]} icon={igrejaIcon} zIndexOffset={1000}>
      <Popup>
        <p className="font-semibold">{church.nome}</p>
        <p className="text-xs opacity-70">{church.endereco.rua}, {church.endereco.numero} · {church.endereco.bairro}</p>
      </Popup>
    </Marker>
  )
}

/** Enquadra os pontos (e a igreja) uma vez, quando a lista muda. */
export function FitPoints({ points, church }: { points: { lat: number; lng: number }[]; church: Church }) {
  const map = useMap()
  React.useEffect(() => {
    const todos = [...points, ...(temPosicao(church) ? [church] : [])].filter(temPosicao)
    if (todos.length > 1) map.fitBounds(L.latLngBounds(todos.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 })
    else if (todos[0]) map.setView([todos[0].lat, todos[0].lng], 15)
  }, [points, church, map])
  return null
}
