# Rebanho

SaaS de gestão de membros para igrejas: landing page e painel com membros, visitas pastorais,
aniversariantes, mapa, carteirinhas, certificados, financeiro, agenda e WhatsApp.

**Stack:** Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, shadcn/ui (Radix),
Clerk (login e organizações), Prisma 7 + PostgreSQL no Neon, Recharts, Leaflet e Zustand.

## Como rodar

Pré-requisitos: Node.js 20+, um projeto no [Neon](https://neon.tech) e uma aplicação no
[Clerk](https://clerk.com).

```bash
npm install                 # também gera o Prisma Client (postinstall)
cp .env.example .env        # preencha as chaves do Neon e do Clerk
npm run db:migrate          # aplica as migrations no banco
npm run db:seed             # opcional: igreja de exemplo com membros
npm run dev                 # http://localhost:3000
```

No painel do Clerk, ative **Organizations** com a opção **Membership required**. Cada igreja é
uma organização, e os usuários dela (pastor, secretaria, tesouraria) são membros dessa organização.

## Fluxo de acesso

1. `/criar-conta` ou `/entrar`: telas do Clerk em português.
2. `/igreja`: o usuário cria a igreja ou escolhe uma para a qual foi convidado.
3. `/app`: painel. O layout confere no servidor se há usuário e igreja ativa. No primeiro acesso,
   cria o registro `Church` no banco, ligado à organização por `clerkOrgId`.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run lint` / `npm run typecheck` | ESLint e TypeScript |
| `npm run format` | Prettier |
| `npm run db:migrate` | Cria e aplica migrations (`prisma migrate dev`) |
| `npm run db:seed` | Popula o banco com dados de exemplo |
| `npm run db:studio` | Abre o Prisma Studio |

## Estrutura

| Caminho | O que é |
| --- | --- |
| `app/(site)` | Landing, páginas de funcionalidades, termos e privacidade |
| `app/(auth)` | Entrar, criar conta e escolha da igreja (`/igreja`) |
| `app/app` | Painel: membros, importar, visitas, aniversários, mapa, carteirinhas, certificados, financeiro, agenda, WhatsApp e configurações |
| `app/verificar/[id]` | Página pública aberta pelo QR Code da carteirinha |
| `proxy.ts` | Middleware do Clerk (a proteção fica em cada layout e Server Action) |
| `prisma/` | Schema, migrations e seed do banco |
| `lib/db.ts` | Prisma Client com o adapter do Neon |
| `lib/church.ts` | Liga a organização do Clerk à igreja no banco |
| `lib/store.ts` | Store Zustand com os dados do painel (ainda em `localStorage`) |
| `lib/types.ts`, `lib/seed.ts` | Tipos e dados de exemplo usados pela store |

## Situação atual

Login, igrejas (organizações) e banco estão ligados. **As telas do painel ainda leem e gravam na
store local (`localStorage`)**: toda igreja vê os mesmos dados de exemplo até a próxima etapa.

## Próximos passos

1. Trocar a store por Server Actions lendo e gravando no banco, com permissões por papel.
2. Geocodificação dos endereços (BrasilAPI, com Nominatim de reserva).
3. Importação de fichas por foto com a API da Claude.
4. WhatsApp via Evolution API.

Os detalhes e as decisões estão em [docs/plano.md](docs/plano.md).
