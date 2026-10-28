# Backup do banco

Toda semana (domingo, entre 3h e 4h de Brasília) a Vercel chama `/api/cron/backup`, que cria uma
branch na Neon chamada `backup-AAAA-MM-DD`: uma cópia do banco naquele momento. Ficam as 4 últimas;
as mais antigas são apagadas sozinhas. Código: `lib/backup.ts`, agendamento: `vercel.json`.

Por que branch e não snapshot: no plano Free a Neon só volta 6 horas no tempo e só permite 1 snapshot
manual, sem agendamento. A branch sem servidor (compute) não gasta horas e só ocupa o que mudar depois.

## Configurar (uma vez)

1. **Chave da Neon:** console.neon.tech → Settings da organização/conta → API keys → criar.
   Prefira uma chave restrita a este projeto.
2. **ID do projeto:** console.neon.tech → projeto → Settings → Project ID.
3. **Segredo do cron:** gere com `openssl rand -hex 32`.
4. Na Vercel: Project → Settings → Environment Variables, ambiente Production:
   `NEON_API_KEY`, `NEON_PROJECT_ID`, `CRON_SECRET`. Depois faça um novo deploy.
5. Para testar já (do computador, com as mesmas variáveis no `.env`): `npm run db:backup`.
   Confira no console da Neon, em Branches, o `backup-` de hoje.

Os erros aparecem em Vercel → Logs, filtrando por `/api/cron/backup`.

## Restaurar

**Tudo de uma vez** (volta o banco inteiro para o dia do backup; o que foi feito depois se perde):

1. console.neon.tech → projeto → Restore.
2. Branch a restaurar: a principal (`main`/`production`).
3. Aba **From another branch** → escolha o `backup-AAAA-MM-DD` → deixe "latest data (head)".
4. Restore. A Neon guarda o estado anterior numa branch `..._old_...`, caso precise desfazer.

Não precisa mudar nada na Vercel: o endereço do banco continua o mesmo.

**Só alguns dados** (ex.: uma igreja apagou membros sem querer):

1. Na branch do backup, crie um compute (Branches → backup → Add compute) e copie a connection string.
2. Consulte e copie só o que precisa (ex.: com `psql` ou o SQL Editor do console) para o banco principal.
3. Apague o compute depois, para não gastar horas.
