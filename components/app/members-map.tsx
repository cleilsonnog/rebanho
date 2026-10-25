"use client"

import "leaflet/dist/leaflet.css"
import "react-leaflet-cluster/dist/assets/MarkerCluster.css"
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css"

import * as React from "react"
import Link from "next/link"
import L from "leaflet"
import { MapContainer, Marker, Popup, useMap } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"

import { ChurchMarker, FitPoints, Tiles, inicio, temPosicao } from "@/components/app/map-base"
import type { Church, Member, MemberStatus } from "@/lib/types"
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
    if (member && temPosicao(member)) map.setView([member.lat, member.lng], 16)
  }, [member, map])
  return null
}

export default function MembersMap({ members, focus, church }: { members: Member[]; focus?: Member; church: Church }) {
  // Quem ainda não tem posição (bairro não localizado) fica fora do mapa.
  const noMapa = React.useMemo(() => members.filter(temPosicao), [members])
  return (
    <MapContainer {...inicio(church)} scrollWheelZoom className="h-full w-full">
      <Tiles />
      <ChurchMarker church={church} />
      <MarkerClusterGroup chunkedLoading>
        {noMapa.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={icons[m.status]}>
            <Popup>
              <div className="min-w-44 text-sm">
                <p className="font-semibold">{m.nome}</p>
                <p className="text-xs opacity-70">{m.endereco.bairro} (posição aproximada)</p>
                <p className="mt-1 text-xs">{STATUS_LABEL[m.status]} · {m.congregacao}</p>
                <Link href={`/app/membros/${m.id}`} className="mt-2 inline-block text-xs font-medium">Abrir ficha →</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      {focus ? <FocusOn member={focus} /> : <FitPoints points={noMapa} church={church} />}
    </MapContainer>
  )
}
