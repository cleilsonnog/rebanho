"use client"

import "leaflet/dist/leaflet.css"
import "react-leaflet-cluster/dist/assets/MarkerCluster.css"
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css"

import * as React from "react"
import Link from "next/link"
import L from "leaflet"
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"

import type { Member, MemberStatus } from "@/lib/types"
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/format"

const icons = Object.fromEntries(
  Object.entries(STATUS_COLOR).map(([k, color]) => [
    k,
    L.divIcon({
      className: "",
      iconSize: [22, 22],
      iconAnchor: [11, 22],
      popupAnchor: [0, -20],
      html: `<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
    }),
  ])
) as Record<MemberStatus, L.DivIcon>

function FocusOn({ member }: { member?: Member }) {
  const map = useMap()
  React.useEffect(() => {
    if (member) map.setView([member.lat, member.lng], 16)
  }, [member, map])
  return null
}

export default function MembersMap({ members, focus }: { members: Member[]; focus?: Member }) {
  return (
    <MapContainer center={[-16.6949, -49.2653]} zoom={13} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup chunkedLoading>
        {members.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={icons[m.status]}>
            <Popup>
              <div className="min-w-44 text-sm">
                <p className="font-semibold">{m.nome}</p>
                <p className="text-xs opacity-70">{m.endereco.rua}, {m.endereco.numero} · {m.endereco.bairro}</p>
                <p className="mt-1 text-xs">{STATUS_LABEL[m.status]} · {m.congregacao}</p>
                <Link href={`/app/membros/${m.id}`} className="mt-2 inline-block text-xs font-medium">Abrir ficha →</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      <FocusOn member={focus} />
    </MapContainer>
  )
}
