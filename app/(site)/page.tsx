import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CloudUpload,
  FileSpreadsheet,
  KeyRound,
  Lock,
  MessageCircle,
  NotebookPen,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  UserMinus,
  Users,
} from "lucide-react"

import { ProductPreview } from "@/components/landing/product-preview"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FEATURES } from "@/lib/features"

const dores = [
  { icon: UserMinus, title: "Gente sumindo sem ninguém perceber", text: "O visitante não volta e o membro deixa de vir. Quando alguém nota, já passou o momento de ligar." },
  { icon: NotebookPen, title: "Visita sem memória", text: "Ninguém lembra quem foi, o que foi conversado ou o que ficou combinado da última vez." },
  { icon: Search, title: "Endereço sem mapa", text: "Os endereços estão no cadastro, mas ninguém enxerga quais famílias moram perto umas das outras." },
  { icon: CalendarDays, title: "Planilha não avisa", text: "Aniversários, datas de batismo e prazos de campanha passam sem que ninguém seja lembrado." },
]

const recursos = [
  { icon: Users, title: "Membros, visitantes e líderes", text: "Histórico, ministério, cargo e situação de cada pessoa." },
  { icon: MessageCircle, title: "WhatsApp integrado", text: "Conecte o número da igreja por QR Code." },
  { icon: BarChart3, title: "Demografia", text: "Faixa etária, batismos, cargos e crescimento." },
  { icon: Search, title: "Busca instantânea", text: "Encontre qualquer informação em segundos." },
  { icon: KeyRound, title: "Níveis de acesso", text: "Cada usuário vê só o que a função dele exige." },
  { icon: CalendarDays, title: "Agenda da igreja", text: "Cultos, reuniões e escalas em um só lugar." },
  { icon: Smartphone, title: "100% online", text: "Funciona no computador e no celular." },
  { icon: CloudUpload, title: "Backup diário", text: "Seus dados copiados automaticamente todos os dias." },
]

const depoimentos = [
  { nome: "Pr. Roberto Siqueira", igreja: "Igreja Batista Esperança", texto: "Em uma semana a secretaria importou 600 fichas antigas. Hoje eu abro o celular e sei quem precisa de visita." },
  { nome: "Dc. Helena Prado", igreja: "Comunidade Vida Nova", texto: "A prestação de contas na assembleia ficou simples. Os gráficos já saem prontos para mostrar." },
  { nome: "Pra. Joana Martins", igreja: "Ministério Semear", texto: "As mensagens de aniversário pelo WhatsApp fizeram os irmãos se sentirem lembrados. Muitos vieram agradecer." },
]

const planoItens = [
  "Membros ilimitados",
  "Controle de visitantes e visitas pastorais",
  "Aniversários automáticos no WhatsApp",
  "Carteirinha com QR Code",
  "Mapa interativo de membros",
  "Células com presença, visitantes e estudo da semana",
  "Certificados em lote",
  "Módulo financeiro completo",
  "Agenda e eventos",
  "Usuários com níveis de acesso",
  "Backup diário e suporte prioritário",
]

const faq = [
  ["Consigo emitir certificados?", "Sim. Há modelos de batismo, apresentação de criança, curso, congresso, membresia e casamento, em três estilos. Você pode imprimir ou salvar em PDF, um por vez ou em lote."],
  ["Tem aplicativo para celular?", "O Rebanho funciona no navegador do celular, sem instalar nada, e pode ser adicionado à tela inicial como um aplicativo."],
  ["Já tenho uma lista de membros. Posso importar?", "Pode. Envie uma planilha (CSV ou Excel exportado em CSV) ou fotografe as fichas de papel. Você revisa os dados antes de salvar."],
  ["Quantos membros posso cadastrar?", "Quantos quiser. Todos os planos têm membros ilimitados."],
  ["Preciso pagar para testar?", "Não. São 14 dias grátis, sem cartão de crédito. Os dados de pagamento só são pedidos se você decidir continuar."],
  ["E se eu quiser cancelar?", "É só cancelar no painel, sem multa e sem fidelidade. Você pode exportar todos os seus dados antes."],
  ["Minha secretária não tem intimidade com tecnologia.", "As telas usam linguagem de igreja e o atendimento no WhatsApp ajuda na configuração inicial e na importação."],
  ["Como funciona a carteirinha com QR Code?", "Cada carteirinha tem um QR Code que abre uma página pública mostrando nome, igreja e se a membresia está ativa. Não é preciso app para escanear."],
  ["Dá para acompanhar as células?", "Sim. Cada célula tem líderes, colíderes, anfitrião e membros, e fica no mapa na casa do anfitrião. O pastor ou a secretaria publica o estudo da semana, e o líder marca a presença, os visitantes e as observações de cada reunião. O líder só vê a própria célula e pode imprimir o estudo ou salvá-lo em PDF."],
  ["O que o mapa de membros mostra?", "Mostra os endereços cadastrados agrupados por região. Ao aproximar, você vê os nomes e pode abrir a ficha para planejar visitas e células."],
  ["Meus dados ficam seguros?", "Sim. Usamos conexão criptografada, backup diário e controle de acesso por função. Dados de fé são sensíveis pela LGPD e são tratados com esse cuidado."],
]

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)]" />
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-10 text-center md:pt-24">
          <Badge variant="secondary" className="mb-6 h-7 px-3 text-sm">
            <Sparkles className="text-highlight-foreground dark:text-highlight" /> Importe suas fichas antigas pela câmera
          </Badge>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold text-balance sm:text-5xl md:text-6xl">
            Cada ovelha conhecida pelo nome, <span className="text-primary italic">nenhuma esquecida</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-muted-foreground">
            Membros, visitas pastorais, dízimos e aniversariantes em um só sistema. E você começa importando a lista que já tem, sem redigitar nomes.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-11 px-6 text-base" asChild>
              <Link href="/criar-conta">Começar teste grátis <ArrowRight /></Link>
            </Button>
            <Button size="lg" variant="outline" className="h-11 px-6 text-base" asChild>
              <Link href="/#precos">Ver planos e preços</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">14 dias grátis · sem cartão de crédito · membros ilimitados</p>
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Feito para a rotina de igreja", "Importação por foto ou planilha", "Adequado à LGPD"].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><Check className="size-4 text-success" /> {t}</span>
            ))}
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-20">
          <ProductPreview />
        </div>
      </section>

      {/* Dores */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold text-balance md:text-4xl">Não falta cuidado. Falta um lugar para a informação.</h2>
            <p className="mt-4 text-muted-foreground">
              Hoje ela está no caderno da secretaria, no computador do tesoureiro e em vários grupos de WhatsApp.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dores.map((d) => (
              <Card key={d.title} className="bg-card/80">
                <CardHeader>
                  <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <d.icon className="size-5" />
                  </span>
                  <CardTitle className="text-base">{d.title}</CardTitle>
                  <CardDescription>{d.text}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Onboarding */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2">
        <div>
          <Badge variant="outline" className="mb-4">Primeiro dia</Badge>
          <h2 className="text-3xl font-semibold text-balance md:text-4xl">Comece com a igreja já cadastrada, não com uma tela vazia.</h2>
          <p className="mt-4 text-muted-foreground">
            Traga a planilha que você já usa ou fotografe as fichas de papel. O Rebanho preenche os campos e você só confere antes de salvar.
          </p>
          <Button className="mt-6" variant="secondary" asChild>
            <Link href="/funcionalidades/importar-fichas">Como funciona a importação <ArrowRight /></Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <FileSpreadsheet className="mb-2 size-8 text-primary" />
              <CardTitle>Planilha</CardTitle>
              <CardDescription>Envie o CSV, ligue as colunas aos campos e importe centenas de pessoas de uma vez.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <Smartphone className="mb-2 size-8 text-primary" />
              <CardTitle>Foto da ficha</CardTitle>
              <CardDescription>Aponte a câmera para a ficha. Nome, telefone, nascimento e endereço já vêm preenchidos.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Funcionalidades principais */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold md:text-4xl">Tudo o que a secretaria, a tesouraria, o pastor e os líderes de célula usam</h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Link key={f.slug} href={`/funcionalidades/${f.slug}`} className="group">
              <Card className="h-full transition group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-lg">
                <CardHeader>
                  <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </span>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                  <CardDescription>{f.short}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
        <div className="mt-10 grid gap-x-8 gap-y-6 rounded-2xl border bg-muted/30 p-8 sm:grid-cols-2 lg:grid-cols-4">
          {recursos.map((r) => (
            <div key={r.title} className="flex gap-3">
              <r.icon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Depoimentos */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-semibold md:text-4xl">
            Feito para a rotina de igreja, não adaptado de um sistema genérico
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {depoimentos.map((d) => (
              <figure key={d.nome} className="rounded-2xl bg-primary-foreground/10 p-6 ring-1 ring-primary-foreground/15">
                <div className="flex gap-0.5 text-highlight">
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} className="size-4 fill-current" />)}
                </div>
                <blockquote className="mt-4 text-pretty">“{d.texto}”</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold">{d.nome}</span>
                  <span className="block opacity-75">{d.igreja}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Preços */}
      <section id="precos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold text-balance md:text-4xl">Um plano completo. Você escolhe como pagar.</h2>
          <p className="mt-4 text-muted-foreground">Membros ilimitados e todas as funcionalidades nos dois planos.</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          <Card className="relative border-primary shadow-xl shadow-primary/10 ring-1 ring-primary">
            <Badge className="absolute -top-3 left-6 bg-highlight text-highlight-foreground">Mais escolhido</Badge>
            <CardHeader>
              <CardTitle className="text-xl">Anual</CardTitle>
              <CardDescription>Economize R$ 118 por ano</CardDescription>
              <p className="pt-4">
                <span className="font-heading text-5xl font-semibold">R$ 470</span>
                <span className="text-muted-foreground">/ano</span>
              </p>
              <p className="text-sm text-muted-foreground">ou 12x de R$ 39,17 no cartão</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {planoItens.map((i) => (
                  <li key={i} className="flex gap-2"><Check className="size-4 shrink-0 text-success" /> {i}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2">
              <Button size="lg" asChild><Link href="/criar-conta?plano=anual">Começar teste grátis</Link></Button>
              <p className="text-center text-xs text-muted-foreground">Cartão, Pix ou boleto</p>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Mensal</CardTitle>
              <CardDescription>Sem fidelidade, cancele quando quiser</CardDescription>
              <p className="pt-4">
                <span className="font-heading text-5xl font-semibold">R$ 49</span>
                <span className="text-muted-foreground">/mês</span>
              </p>
              <p className="text-sm text-muted-foreground">cobrado mensalmente</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {planoItens.map((i) => (
                  <li key={i} className="flex gap-2"><Check className="size-4 shrink-0 text-success" /> {i}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2">
              <Button size="lg" variant="outline" asChild><Link href="/criar-conta?plano=mensal">Começar teste grátis</Link></Button>
              <p className="text-center text-xs text-muted-foreground">Cartão, Pix ou boleto</p>
            </CardFooter>
          </Card>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 text-sm sm:grid-cols-3">
          {[
            { icon: ShieldCheck, t: "14 dias grátis", d: "Sem cartão de crédito." },
            { icon: Lock, t: "Sem fidelidade", d: "Cancele sem multa." },
            { icon: CloudUpload, t: "Backup diário", d: "Automático, todos os dias." },
          ].map((g) => (
            <div key={g.t} className="flex items-start gap-3 rounded-xl border p-4">
              <g.icon className="size-5 shrink-0 text-primary" />
              <div><p className="font-medium">{g.t}</p><p className="text-muted-foreground">{g.d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="perguntas" className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20">
          <h2 className="text-center text-3xl font-semibold md:text-4xl">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="mt-10">
            {faq.map(([q, a]) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger className="text-left text-base">{q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary to-[color-mix(in_oklch,var(--primary),black_25%)] px-6 py-16 text-center text-primary-foreground md:px-16">
          <h2 className="mx-auto max-w-3xl text-3xl font-semibold text-balance md:text-4xl">
            Sua próxima reunião de liderança pode começar com os números na tela.
          </h2>
          <p className="mx-auto mt-4 max-w-xl opacity-85">
            Importe sua lista hoje e tenha membresia, visitantes e finanças à vista no mesmo dia.
          </p>
          <Button size="lg" className="mt-8 h-11 bg-highlight px-6 text-base text-highlight-foreground hover:bg-highlight/90" asChild>
            <Link href="/criar-conta">Começar teste grátis <ArrowRight /></Link>
          </Button>
          <p className="mt-3 text-sm opacity-75">14 dias grátis · sem cartão de crédito</p>
        </div>
      </section>
    </>
  )
}
