export const metadata = { title: "Termos de Serviço" }

export default function TermosPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-muted-foreground">
      <h1 className="text-4xl font-semibold text-foreground">Termos de Serviço</h1>
      <p>Ao criar uma conta, a igreja contratante declara ter autorização para tratar os dados dos seus membros e se responsabiliza pela veracidade das informações cadastradas.</p>
      <h2 className="pt-4 text-xl font-semibold text-foreground">Teste e assinatura</h2>
      <p>O teste gratuito dura 14 dias. Depois dele, a assinatura é mensal ou anual e pode ser cancelada a qualquer momento, sem multa.</p>
      <h2 className="pt-4 text-xl font-semibold text-foreground">Cancelamento</h2>
      <p>Após o cancelamento, os dados ficam disponíveis para exportação por 30 dias e depois são excluídos definitivamente.</p>
      <p className="pt-6 text-sm">Texto modelo: revise com seu jurídico antes de publicar.</p>
    </article>
  )
}
