import Link from "next/link"

export const metadata = { title: "Política de Privacidade" }

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="pt-4 text-xl font-semibold text-foreground">{titulo}</h2>
      {children}
    </section>
  )
}

export default function PrivacidadePage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-muted-foreground">
      <h1 className="text-4xl font-semibold text-foreground">Política de Privacidade</h1>
      <p className="text-sm">Última atualização: 24 de outubro de 2026</p>
      <p>
        Dados de membros de igrejas revelam convicção religiosa, que a Lei Geral de Proteção de Dados (Lei 13.709/2018)
        classifica como dado pessoal sensível. Por isso, o Rebanho trata essas informações apenas para a gestão da igreja
        contratante. As responsabilidades de cada parte estão nos{" "}
        <Link href="/termos" className="text-primary underline">Termos de Serviço e Responsabilidade</Link>.
      </p>

      <Secao titulo="O que coletamos">
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Dados dos membros</strong>, cadastrados pela igreja: nome, contato, endereço, datas (nascimento,
            batismo, membresia), cargo, ministérios, visitas pastorais, contribuições, certificados e a célula que
            frequentam, com a presença em cada reunião.
          </li>
          <li>
            <strong>Visitantes de células</strong>, lançados pelo líder: nome e, se informado, telefone.
          </li>
          <li><strong>Dados dos usuários do sistema</strong>: nome, e-mail e função na igreja.</li>
          <li><strong>Dados técnicos</strong> necessários para o login e a segurança da conta.</li>
        </ul>
      </Secao>

      <Secao titulo="Onde os dados ficam">
        <ul className="ml-5 list-disc space-y-2">
          <li>Os dados da igreja e dos membros ficam num banco de dados PostgreSQL da Neon, hospedado em São Paulo, Brasil.</li>
          <li>
            O login é feito pelo Clerk, empresa dos Estados Unidos. Ele trata o nome, o e-mail e a senha dos usuários do
            sistema (os membros cadastrados não passam pelo Clerk). Há, portanto, transferência internacional desses dados
            de login, com as garantias contratuais do fornecedor.
          </li>
          <li>
            Para pôr a igreja e as células no mapa, o endereço digitado (rua, número, bairro, cidade e CEP, sem nome de
            pessoa) é consultado no Nominatim, do OpenStreetMap, e na BrasilAPI. Para os membros, só o bairro e a cidade
            são consultados. As imagens do mapa vêm do OpenStreetMap.
          </li>
          <li>A logo da igreja fica guardada no Clerk, junto com a organização da igreja.</li>
        </ul>
      </Secao>

      <Secao titulo="Como protegemos">
        <ul className="ml-5 list-disc space-y-2">
          <li>Conexão criptografada (HTTPS) entre o navegador, o servidor e o banco de dados.</li>
          <li>Isolamento entre igrejas: cada consulta é limitada à igreja do usuário logado.</li>
          <li>
            Controle de acesso por função, aplicado no servidor: o que a função não pode ver nem chega ao navegador. Os
            dados financeiros só vão para o administrador e a tesouraria.
          </li>
          <li>
            Endereços, mapa e anotações de visitas pastorais só vão para o administrador, a secretaria e o pastor. O líder de
            célula recebe apenas as pessoas da sua célula, sem posição no mapa. A tesouraria recebe só os nomes, sem
            endereço nem contato. A secretaria ou o pastor de uma filial pode ficar restrito aos dados dela.
          </li>
          <li>
            No mapa de membros, o pino fica numa posição aproximada do bairro, não na casa. Só a casa onde a célula se
            reúne é marcada no ponto exato.
          </li>
          <li>Validação no servidor de todas as informações enviadas pelos formulários.</li>
        </ul>
      </Secao>

      <Secao titulo="Página pública da carteirinha">
        <p>
          O QR Code da carteirinha abre uma página pública para conferir a membresia. Ela mostra somente o nome, a igreja,
          a situação, o cargo, a congregação e a data de membresia. Telefone, endereço, e-mail e demais dados nunca
          aparecem nessa página.
        </p>
      </Secao>

      <Secao titulo="Compartilhamento">
        <p>
          Não vendemos nem compartilhamos dados para publicidade. Os dados só são acessados pelos fornecedores
          necessários para o serviço funcionar (hospedagem, banco de dados, login e localização no mapa), sempre para essa
          finalidade.
        </p>
      </Secao>

      <Secao titulo="Seus direitos">
        <p>
          O titular pode pedir acesso, correção, portabilidade ou exclusão dos seus dados à secretaria da sua igreja, que é
          a responsável por eles, ou pelo nosso canal de atendimento. O administrador da igreja pode exportar todos os
          dados a qualquer momento em Configurações › Dados.
        </p>
      </Secao>

      <p className="pt-6 text-sm">Texto modelo: revise com seu jurídico antes de publicar.</p>
    </article>
  )
}
