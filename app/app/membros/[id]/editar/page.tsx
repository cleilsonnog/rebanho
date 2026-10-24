"use client"

import { useParams } from "next/navigation"

import { MemberForm } from "@/components/app/member-form"
import { PageHeader } from "@/components/app/page-header"
import { useMember } from "@/lib/store"

export default function EditarMembroPage() {
  const { id } = useParams<{ id: string }>()
  const member = useMember(id)
  if (!member) return <p className="text-muted-foreground">Membro não encontrado.</p>
  return (
    <>
      <PageHeader title={`Editar ${member.nome}`} />
      <MemberForm member={member} />
    </>
  )
}
