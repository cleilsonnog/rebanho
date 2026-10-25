import {
  Award,
  Cake,
  Camera,
  HandCoins,
  HeartHandshake,
  House,
  IdCard,
  MapPinned,
  Users,
  type LucideIcon,
} from "lucide-react"

export interface Feature {
  slug: string
  icon: LucideIcon
  title: string
  short: string
  description: string
  bullets: string[]
  appHref: string
}

export const FEATURES: Feature[] = [
  {
    slug: "cadastro-de-membros",
    icon: Users,
    title: "Cadastro de membros",
    short: "Ficha completa com histórico, ministérios, cargo e situação.",
    description:
      "Cada pessoa tem uma ficha única com dados pessoais, família, endereço, batismo, cargos e ministérios. Visitantes, membros e líderes ficam no mesmo lugar, com filtros que respondem em segundos.",
    bullets: ["Membros ilimitados", "Filtros por congregação, cargo e situação", "Histórico de visitas na ficha", "Exportação para planilha"],
    appHref: "/app/membros",
  },
  {
    slug: "importar-fichas",
    icon: Camera,
    title: "Importar fichas pela câmera",
    short: "Fotografe a ficha de papel e só confira os campos.",
    description:
      "Sua secretaria não precisa redigitar anos de cadastro. Envie uma planilha ou fotografe as fichas antigas: o sistema preenche os campos e você só revisa antes de salvar.",
    bullets: ["Importação de planilha CSV/Excel", "Leitura de ficha por foto", "Revisão antes de gravar", "Detecção de duplicados"],
    appHref: "/app/importar",
  },
  {
    slug: "dizimos-e-ofertas",
    icon: HandCoins,
    title: "Dízimos e ofertas",
    short: "Entradas, saídas, campanhas e relatórios para a tesouraria.",
    description:
      "Lance dízimos por membro, ofertas por culto, campanhas e despesas. O painel mostra saldo, fluxo do mês e para onde vai cada real, pronto para apresentar ao conselho.",
    bullets: ["Dízimo vinculado ao membro", "Campanhas com meta", "Fluxo mensal e por categoria", "Relatório para assembleia"],
    appHref: "/app/financeiro",
  },
  {
    slug: "aniversarios-no-whatsapp",
    icon: Cake,
    title: "Aniversários no WhatsApp",
    short: "Lembretes automáticos de aniversário e de batismo.",
    description:
      "Conecte o WhatsApp da igreja e programe mensagens de parabéns. Você também recebe o aviso antes da data para ligar ou visitar.",
    bullets: ["Mensagem personalizada", "Envio automático ou manual", "Aniversário de batismo", "Lista semanal para o pastor"],
    appHref: "/app/aniversarios",
  },
  {
    slug: "certificados",
    icon: Award,
    title: "Certificados",
    short: "Batismo, cursos, congressos e apresentação de crianças.",
    description:
      "Escolha o modelo, selecione as pessoas e gere certificados em PDF, um a um ou em lote, com o nome da igreja e a assinatura do pastor.",
    bullets: ["3 estilos de modelo", "Emissão em lote", "Impressão ou PDF", "Registro do que foi emitido"],
    appHref: "/app/certificados",
  },
  {
    slug: "carteirinha-qr-code",
    icon: IdCard,
    title: "Carteirinha com QR Code",
    short: "Carteirinha com foto e QR Code que confirma a membresia.",
    description:
      "Gere carteirinhas com foto, logo e validade. O QR Code abre uma página pública que mostra se a membresia está ativa, útil em eventos, congressos e transferências.",
    bullets: ["Validação pública por QR Code", "Validade configurável", "Impressão frente e verso", "Sem app para escanear"],
    appHref: "/app/carteirinhas",
  },
  {
    slug: "mapa-de-membros",
    icon: MapPinned,
    title: "Mapa de membros",
    short: "Veja por bairro onde as famílias moram, com sede, filiais e células.",
    description:
      "Um mapa interativo que abre na sua igreja, com a sede, as filiais e as casas das células. Cada membro aparece numa posição aproximada do bairro, nunca na porta de casa, e só quem cuida das pessoas vê o mapa.",
    bullets: ["Sede, filiais e células no mapa", "Pino aproximado por bairro, para proteger as famílias", "Filtro por situação e por filial", "Clique e veja a ficha"],
    appHref: "/app/mapa",
  },
  {
    slug: "celulas",
    icon: House,
    title: "Células",
    short: "Presença, visitantes e o estudo da semana de cada célula.",
    description:
      "Cada célula tem nome, casal de líderes, colíderes e anfitrião, e aparece no mapa na casa de quem a recebe. O pastor publica o estudo da semana uma vez e todas as células recebem. O líder marca a presença, anota os visitantes e as observações da reunião pelo celular.",
    bullets: [
      "Líderes, colíderes e anfitrião",
      "Presença e visitantes de cada reunião",
      "Estudo da semana para imprimir ou salvar em PDF",
      "Casa do anfitrião no mapa",
    ],
    appHref: "/app/celulas",
  },
  {
    slug: "visitas-pastorais",
    icon: HeartHandshake,
    title: "Visitas pastorais",
    short: "Quem visitou, o que foi conversado e quando voltar.",
    description:
      "Toda visita entra no histórico da pessoa com data, responsável, motivo e anotações. Quem for na próxima vez já chega sabendo o contexto.",
    bullets: ["Histórico por membro", "Próxima visita agendada", "Alertas de afastados", "Relatório por responsável"],
    appHref: "/app/visitas",
  },
]
