import Link from "next/link"

export const metadata = { title: "Termos de Serviço e Responsabilidade" }

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="pt-4 text-xl font-semibold text-foreground">{titulo}</h2>
      {children}
    </section>
  )
}

export default function TermosPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-muted-foreground">
      <h1 className="text-4xl font-semibold text-foreground">Termos de Serviço e Responsabilidade</h1>
      <p className="text-sm">Última atualização: 24 de outubro de 2026</p>
      <p>
        Estes termos valem para a igreja que contrata o Rebanho e para todas as pessoas que ela convida a usar o
        sistema. Ao criar uma conta ou aceitar um convite, você concorda com eles e com a{" "}
        <Link href="/privacidade" className="text-primary underline">Política de Privacidade</Link>.
      </p>

      <Secao titulo="1. Quem é responsável pelos dados">
        <p>
          Pela Lei Geral de Proteção de Dados (Lei 13.709/2018), a <strong>igreja é a controladora</strong> dos dados
          dos seus membros: é ela quem decide o que cadastrar e para quê. O <strong>Rebanho é o operador</strong>:
          guarda e processa esses dados apenas para prestar o serviço, conforme as instruções da igreja.
        </p>
      </Secao>

      <Secao titulo="2. Responsabilidades da igreja">
        <ul className="ml-5 list-disc space-y-2">
          <li>Ter base legal para tratar os dados dos membros, como o consentimento de cada pessoa, lembrando que a fé religiosa é dado pessoal sensível.</li>
          <li>Cadastrar dados de crianças e adolescentes somente com o consentimento de um dos pais ou responsável, conforme o art. 14 da LGPD.</li>
          <li>Cadastrar apenas o necessário para a gestão da igreja e manter as informações corretas e atualizadas.</li>
          <li>
            Escolher quem acessa o sistema e com qual função (administrador, secretaria, tesouraria, pastor ou líder de célula), e
            desativar ou remover o acesso de quem deixar a função. Tudo o que um usuário convidado faz é de
            responsabilidade da igreja.
          </li>
          <li>Proteger as senhas e não compartilhar contas entre pessoas.</li>
          <li>Atender os pedidos dos membros sobre os próprios dados (acesso, correção, exclusão e portabilidade).</li>
          <li>Responder pelo conteúdo das mensagens enviadas aos membros, inclusive pelo WhatsApp, e enviá-las somente a quem concordou em recebê-las.</li>
        </ul>
      </Secao>

      <Secao titulo="3. Responsabilidades do Rebanho">
        <ul className="ml-5 list-disc space-y-2">
          <li>Usar os dados somente para prestar o serviço, sem vendê-los nem compartilhá-los para outras finalidades.</li>
          <li>Manter os dados de cada igreja isolados, de modo que uma igreja nunca veja nem altere os dados de outra.</li>
          <li>Aplicar o controle de acesso por função no servidor: cada usuário só vê e altera o que a sua função permite.</li>
          <li>Usar conexão criptografada e validar no servidor todas as informações enviadas.</li>
          <li>Avisar a igreja, em prazo razoável, sobre qualquer incidente de segurança que afete os dados dela.</li>
        </ul>
      </Secao>

      <Secao titulo="4. Contas e acesso">
        <p>
          Quem cria a conta da igreja se torna o administrador. Somente o administrador convida usuários, define funções
          e altera os dados da igreja. O login é feito por um provedor especializado em autenticação (Clerk), e o
          Rebanho não armazena senhas.
        </p>
      </Secao>

      <Secao titulo="5. WhatsApp">
        <p>
          A integração com o WhatsApp usa o número da própria igreja. Conexões feitas por QR Code não são oficiais do
          WhatsApp, e o número pode ser bloqueado pela Meta. A igreja assume esse risco ao conectar o número. Para
          igrejas que precisam de estabilidade, recomendamos a API oficial.
        </p>
      </Secao>

      <Secao titulo="6. Teste, assinatura e cancelamento">
        <p>
          O teste gratuito dura 14 dias. Depois dele, a assinatura é mensal ou anual e pode ser cancelada a qualquer
          momento, sem multa. A qualquer momento, o administrador pode baixar uma cópia completa dos dados em
          Configurações › Dados. Após o cancelamento, os dados ficam disponíveis para exportação por 30 dias e depois são
          excluídos definitivamente.
        </p>
      </Secao>

      <Secao titulo="7. Disponibilidade e alterações">
        <p>
          Fazemos o possível para manter o serviço disponível, mas podem ocorrer interrupções para manutenção ou por falhas
          de terceiros. Se estes termos mudarem, avisaremos o administrador da igreja antes que as mudanças entrem em
          vigor.
        </p>
      </Secao>

      <p className="pt-6 text-sm">Texto modelo: revise com seu jurídico antes de publicar.</p>
    </article>
  )
}
