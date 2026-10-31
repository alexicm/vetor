# VETOR

SaaS de conversão, vetorização e preparação gráfica. A interface é em português brasileiro. Os motores de conversão são reais: Sharp, VTracer, resvg, SVGO, pdf-lib e PDF.js.

## Requisitos

- Node.js 20.11+
- pnpm 11+

Docker é opcional. Sem Docker, o app roda em modo local (arquivos em `.data/`). O Supabase local e os Vercel Daemons exigem Docker.

## Instalação

```bash
pnpm install
cp .env.example .env.local
pnpm fixtures
pnpm dev
```

Abra `http://localhost:3000`, crie uma conta e envie um PNG para vetorizar.

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

Quando tiver um projeto:

1. Aplique `supabase/migrations`.
2. Preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
3. Defina `VETOR_RUNTIME=supabase`.

Não coloque a service role em variável `NEXT_PUBLIC_*`.

## Deploy

A web vai para a Vercel com root `apps/web`. O worker fica de fora das rotas HTTP. Veja `docs/operations.md`.

Não faça deploy sem autorização explícita.
