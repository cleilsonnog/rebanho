# Rebanho

SaaS de gestão de membros para igrejas: landing page e painel com membros, visitas pastorais,
aniversariantes, mapa, carteirinhas, certificados, financeiro, agenda e WhatsApp.

**Stack:** Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, shadcn/ui (Radix),
Clerk (login e organizações), Prisma 7 + PostgreSQL no Neon, Zod, Recharts, Leaflet e Zustand.

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
| `lib/church.ts` | Sessão: liga a organização do Clerk à igreja e o login ao usuário da igreja (com a função) |
| `lib/validations.ts` | Esquemas Zod de todos os formulários (usados no navegador e no servidor) |
| `lib/permissions.ts` | O que cada função pode ver e alterar |
| `lib/action.ts` | `secureAction`: sessão → permissão → Zod, em toda Server Action |
| `lib/actions/` | Server Actions por área (membros, visitas, financeiro, agenda, certificados, igreja, usuários) |
| `lib/data.ts` | Carrega os dados da igreja ativa e converte do banco para os tipos das telas |
| `lib/store.ts` | Store Zustand por requisição: cache dos dados no navegador, alterado só via Server Actions |
| `lib/seed.ts`, `lib/demo.ts` | Dados de exemplo e a função que os grava numa igreja |

## Segurança

Toda gravação passa por uma Server Action que usa `secureAction` ([lib/action.ts](lib/action.ts)):

1. **Sessão**: usuário logado no Clerk com uma igreja ativa; usuário desativado é bloqueado.
2. **Permissão**: a função do usuário (`ChurchUser.papel`) precisa poder alterar a área.
3. **Validação**: a entrada passa pelo esquema Zod. Campos extras são descartados.
4. **Isolamento**: toda consulta filtra por `churchId` da sessão; referências a membros são conferidas.

Os mesmos esquemas validam no navegador para mostrar o erro no campo, mas a validação que vale é a do servidor.
Dados que a função não pode ver (ex.: financeiro para a secretaria) não são enviados ao navegador.

| Função | Pode alterar |
| --- | --- |
| Administrador | Tudo, inclusive usuários, dados da igreja e WhatsApp |
| Secretaria | Membros, visitas, certificados e agenda |
| Pastor(a) | Membros, visitas e agenda |
| Tesouraria | Financeiro (é a única, além do admin, que vê o financeiro) |
| Líder de ministério | Agenda |

A função fica no banco, e não nos papéis do Clerk, porque papéis customizados do Clerk são pagos em produção.
Quem cria a igreja vira administrador; convidados entram com a função escolhida no convite.

Uma igreja nova começa vazia. Para testar, use **Configurações › Dados › Carregar dados de exemplo**.

## Próximos passos

1. Geocodificação dos endereços (BrasilAPI, com Nominatim de reserva).
2. Importação de fichas por foto com a API da Claude.
3. WhatsApp via Evolution API.

Os detalhes e as decisões estão em [docs/plano.md](docs/plano.md).
