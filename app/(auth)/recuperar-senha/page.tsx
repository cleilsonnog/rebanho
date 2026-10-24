import { redirect } from "next/navigation"

// A recuperação de senha agora acontece dentro do fluxo de login do Clerk ("Esqueceu a senha?").
export default function RecuperarSenhaPage() {
  redirect("/entrar")
}
