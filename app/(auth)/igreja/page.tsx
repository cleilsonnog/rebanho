import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { AbrirIgreja, CriarIgreja } from "@/components/app/igreja-forms"
import { SairButton } from "@/components/portal/portal-client"
import { igrejasParaEscolher } from "@/lib/church"
import { ROLE_LABEL } from "@/lib/format"
import { contaLogada } from "@/lib/login"
import { resolverAcesso } from "@/lib/portal"

export const metadata: Metadata = { title: "Sua igreja" }

// Escolha da igreja (quem faz parte de mais de uma) e cadastro de igreja nova. Convites da equipe feitos para
// o e-mail da conta são ligados aqui. Quem não é da equipe de nenhuma igreja, mas tem o portal liberado, vai
// direto para o portal do membro.
export default async function IgrejaPage() {
  const { userId } = await auth({ treatPendingAsSignedOut: false })
  if (!userId) redirect("/entrar")
  const conta = await contaLogada()
  const emails = conta?.emails ?? []
  const [vinculos, acesso] = await Promise.all([igrejasParaEscolher(userId, emails), resolverAcesso(emails)])
  const temPortal = acesso.tipo !== "sem-acesso"
  if (vinculos.length === 0 && temPortal) redirect("/membro")

  return (
    <>
      <h1 className="text-3xl font-semibold">{vinculos.length ? "Suas igrejas" : "Cadastre a sua igreja"}</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        {vinculos.length
          ? "Escolha a igreja que você quer abrir."
          : `Foi convidado para a equipe de uma igreja? Entre com o e-mail do convite. Esta conta usa: ${emails.join(", ") || "nenhum e-mail confirmado"}.`}
      </p>

      {vinculos.length > 0 && (
        <div className="mb-8 space-y-2">
          {vinculos.map((v) => (
            <AbrirIgreja key={v.id} id={v.churchId} nome={v.church.nome} detalhe={ROLE_LABEL[v.papel]} desativado={!v.ativo} />
          ))}
        </div>
      )}

      <div className="rounded-xl border p-4">
        <p className="mb-3 font-medium">{vinculos.length ? "Cadastrar outra igreja" : "Nova igreja"}</p>
        <CriarIgreja />
        <p className="mt-3 text-xs text-muted-foreground">Você será o administrador e pode convidar a equipe depois.</p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm text-muted-foreground">
        {temPortal && (
          <p>Quer ver seus dados de membro? <Link href="/membro" className="text-primary hover:underline">Abrir o portal do membro</Link></p>
        )}
        <SairButton para="/entrar" />
      </div>
    </>
  )
}
