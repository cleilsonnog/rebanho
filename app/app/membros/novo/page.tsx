import { MemberForm } from "@/components/app/member-form"
import { PageHeader } from "@/components/app/page-header"

export const metadata = { title: "Novo membro" }

export default function NovoMembroPage() {
  return (
    <>
      <PageHeader title="Novo membro" description="Cadastre membros, visitantes ou congregados." />
      <MemberForm />
    </>
  )
}
