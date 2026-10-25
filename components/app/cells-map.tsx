"use client"

import "leaflet/dist/leaflet.css"

import * as React from "react"
import Link from "next/link"
import L from "leaflet"
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet"

import { cellSchedule } from "@/lib/format"
import type { Cell, Member } from "@/lib/types"

/** Pino em forma de casa: a célula fica onde mora o anfitrião. */
const casa = L.divIcon({
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
  html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#6d3fd8;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"><svg style="transform:rotate(45deg)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg></span>`,
})

const CENTRO: [number, number] = [-16.6949, -49.2653]
const temPosicao = (c: { lat: number; lng: number }) => c.lat !== 0 || c.lng !== 0
const TILES = (
  <TileLayer
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />
)

function FitCells({ cells, focus }: { cells: Cell[]; focus?: Cell }) {
  const map = useMap()
  React.useEffect(() => {
    if (focus && temPosicao(focus)) map.setView([focus.lat, focus.lng], 16)
    else if (cells.length > 1) map.fitBounds(L.latLngBounds(cells.map((c) => [c.lat, c.lng])), { padding: [40, 40], maxZoom: 15 })
    else if (cells[0]) map.setView([cells[0].lat, cells[0].lng], 15)
  }, [cells, focus, map])
  return null
}

/** Todas as células no mapa, cada uma na casa do anfitrião. */
export default function CellsMap({ cells, members, focus }: { cells: Cell[]; members: Member[]; focus?: Cell }) {
  const byId = React.useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const noMapa = React.useMemo(() => cells.filter(temPosicao), [cells])
  return (
    <MapContainer center={CENTRO} zoom={13} scrollWheelZoom className="h-full w-full">
      {TILES}
      {noMapa.map((c) => (
        <Marker key={c.id} position={[c.lat, c.lng]} icon={casa}>
          <Popup>
            <div className="min-w-48 text-sm">
              <p className="font-semibold">Célula {c.nome}</p>
              <p className="text-xs opacity-70">{cellSchedule(c)}</p>
              <p className="mt-1 text-xs">
                Anfitrião: {c.anfitrioes.map((id) => byId.get(id)?.nome).filter(Boolean).join(" e ") || "—"}
              </p>
              <p className="text-xs opacity-70">{c.endereco.rua}, {c.endereco.numero} · {c.endereco.bairro}</p>
              <Link href={`/app/celulas/${c.id}`} className="mt-2 inline-block text-xs font-medium">Abrir célula →</Link>
            </div>
          </Popup>
        </Marker>
      ))}
      <FitCells cells={noMapa} focus={focus} />
    </MapContainer>
  )
}

function PickOnClick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  React.useEffect(() => {
    if (lat !== 0 || lng !== 0) map.setView([lat, lng], Math.max(map.getZoom(), 16))
  }, [lat, lng, map])
  return null
}

/** Mapa pequeno do formulário: clique ou arraste o pino até a casa do anfitrião. */
export function LocationPicker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  const marcado = lat !== 0 || lng !== 0
  return (
    <MapContainer center={marcado ? [lat, lng] : CENTRO} zoom={marcado ? 16 : 12} scrollWheelZoom className="h-full w-full">
      {TILES}
      <PickOnClick onPick={onChange} />
      <Recenter lat={lat} lng={lng} />
      {marcado && (
        <Marker
          position={[lat, lng]}
          icon={casa}
          draggable
          eventHandlers={{ dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); onChange(p.lat, p.lng) } }}
        />
      )}
    </MapContainer>
  )
}
