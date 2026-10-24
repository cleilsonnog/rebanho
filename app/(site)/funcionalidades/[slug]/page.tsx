import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FEATURES } from "@/lib/features"

export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const f = FEATURES.find((x) => x.slug === slug)
  return f ? { title: f.title, description: f.short } : {}
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const feature = FEATURES.find((f) => f.slug === slug)
  if (!feature) notFound()
  const outras = FEATURES.filter((f) => f.slug !== slug).slice(0, 3)

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <Button variant="ghost" size="sm" asChild className="mb-8">
        <Link href="/"><ArrowLeft /> Voltar</Link>
      </Button>
      <div className="grid gap-12 md:grid-cols-[1.2fr_1fr]">
        <div>
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <feature.icon className="size-7" />
          </span>
          <h1 className="mt-6 text-4xl font-semibold md:text-5xl">{feature.title}</h1>
          <p className="mt-6 text-lg text-muted-foreground">{feature.description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild><Link href="/criar-conta">Testar grátis por 14 dias <ArrowRight /></Link></Button>
            <Button size="lg" variant="outline" asChild><Link href={feature.appHref}>Ver na demonstração</Link></Button>
          </div>
        </div>
        <Card className="self-start">
          <CardHeader>
            <CardTitle>O que você ganha</CardTitle>
            <ul className="mt-4 space-y-3">
              {feature.bullets.map((b) => (
                <li key={b} className="flex gap-2 text-sm"><Check className="size-4 shrink-0 text-success" /> {b}</li>
              ))}
            </ul>
          </CardHeader>
        </Card>
      </div>
      <h2 className="mt-20 text-2xl font-semibold">Conheça também</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {outras.map((f) => (
          <Link key={f.slug} href={`/funcionalidades/${f.slug}`}>
            <Card className="h-full transition hover:border-primary/40">
              <CardHeader>
                <f.icon className="mb-2 size-5 text-primary" />
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription>{f.short}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
