export const metadata = { title: "Política de Privacidade" }

export default function PrivacidadePage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-muted-foreground">
      <h1 className="text-4xl font-semibold text-foreground">Política de Privacidade</h1>
      <p>
        Dados de membros de igrejas revelam convicção religiosa, que a Lei Geral de Proteção de Dados (Lei 13.709/2018) classifica como dado pessoal sensível. Por isso o Rebanho trata essas informações apenas para a finalidade de gestão da igreja contratante.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-foreground">O que coletamos</h2>
      <p>Dados cadastrais inseridos pela igreja (nome, contato, endereço, datas eclesiásticas) e dados de uso da plataforma.</p>
      <h2 className="pt-4 text-xl font-semibold text-foreground">Como protegemos</h2>
      <p>Conexão criptografada, backup diário, controle de acesso por função e registro de quem acessou cada informação.</p>
      <h2 className="pt-4 text-xl font-semibold text-foreground">Seus direitos</h2>
      <p>O titular pode solicitar acesso, correção, portabilidade ou exclusão dos dados à secretaria da sua igreja ou pelo nosso canal de atendimento.</p>
      <p className="pt-6 text-sm">Texto modelo: revise com seu jurídico antes de publicar.</p>
    </article>
  )
}
