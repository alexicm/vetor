# VETOR

SaaS de conversão, vetorização e preparação gráfica. A interface é em português brasileiro. Os motores de conversão são reais: Sharp, VTracer, resvg, SVGO, pdf-lib e PDF.js.

## Requisitos

- Node.js 20.11+
- pnpm 11+

Docker é opcional. Sem Docker, o app pode rodar em modo local (arquivos em `.data/`). O Supabase local e os Vercel Daemons exigem Docker.

## Instalação

```bash
pnpm install
cp .env.example .env.local
pnpm fixtures
pnpm dev
```

Abra `http://localhost:3000`, crie uma conta e envie um PNG para vetorizar.

Com as credenciais do Supabase no `.env.local` e `VETOR_RUNTIME=supabase`, o app usa o backend remoto.

## Comandos

| Comando | Função |
| --- | --- |
| `pnpm dev` | Web + worker |
| `pnpm dev:web` | Só a interface |
| `pnpm dev:worker` | Só o consumidor da fila |
| `pnpm test` | Testes Vitest dos motores |
| `pnpm test:e2e` | Playwright |
| `pnpm fixtures` | Gera arquivos reais em `tests/fixtures` |
| `pnpm typecheck` | TypeScript |

## Estrutura

```
apps/web          Next.js
apps/worker       Worker da fila
packages/core     Motores gráficos
packages/contracts
supabase/migrations
docs/
```

## Supabase

O schema está em `supabase/migrations`. Depois de `supabase link` e `supabase db push`, preencha:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VETOR_RUNTIME=supabase`

Nunca coloque a service role em variável `NEXT_PUBLIC_*`.

## Deploy

A web vai para a Vercel. O worker fica de fora das rotas HTTP. Veja `docs/operations.md`.
