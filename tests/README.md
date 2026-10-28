# Testes de segurança

`npm test` confere as regras que protegem os dados, chamando as mesmas Server Actions que as telas
chamam, com o login simulado para cada função:

- `isolamento.test.ts`: uma igreja não vê nem altera nada de outra, mesmo sabendo os ids.
- `visibilidade.test.ts`: o que cada função recebe (endereço, mapa, visitas, financeiro, células).
- `permissoes.test.ts`: o que cada função pode gravar, e a validação no servidor.
- `filiais.test.ts`: secretaria ou pastor de filial só veem e alteram a filial deles.
- `rotas.test.ts`: a rota do backup exige a senha; o limite de pedidos funciona.

Rode antes de cada commit que mexa em `lib/`, nas ações ou nas permissões. Leva uns 30 segundos.

## Banco de testes

Os testes usam a branch `testes` da Neon (`TEST_DATABASE_URL` e `TEST_DIRECT_URL` no `.env`), sem dados
reais. Eles se recusam a rodar se esse endereço for o mesmo da produção. Cada arquivo cria igrejas
"TESTE ..." com os dados de exemplo e apaga no fim.

Depois de uma migração nova, aplique também no banco de testes:

    DIRECT_URL="$TEST_DIRECT_URL" npx prisma migrate deploy

(com as variáveis do `.env` carregadas, ex.: `set -a; . ./.env; set +a`).

## O que não está coberto

- O bloqueio de usuário desativado e a ligação com o Clerk (o login é simulado).
- Convites por e-mail e logo (dependem do Clerk).
- As telas em si; os testes olham o que o servidor entrega e aceita.
