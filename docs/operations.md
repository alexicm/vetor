# Operação

## Desenvolvimento local (sem Supabase)

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Abra `http://localhost:3000`. Crie uma conta em `/cadastro`. Os dados ficam em `.data/`.

O modo local é o padrão quando `NEXT_PUBLIC_SUPABASE_URL` não está definido.

## Desenvolvimento com Supabase

1. Crie um projeto no dashboard da Supabase.
2. Aplique as migrations em `supabase/migrations`.
3. Crie os buckets privados `originals` e `outputs`.
4. Preencha `.env.local` com URL, chave pública e `SUPABASE_SERVICE_ROLE_KEY`.
5. Defina `VETOR_RUNTIME=supabase`.
6. Rode `pnpm dev` (web + worker).

Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` em variável `NEXT_PUBLIC_*`.

## Worker

```bash
pnpm dev:worker
```

O worker processa uma mensagem por vez, com visibility timeout, retry limitado e arquivamento após sucesso.

Sem Docker, execute o processo Node. O `apps/worker/Dockerfile` serve para implantação futura.

## Vercel

A aplicação web é um projeto Next.js em `apps/web`.

O worker **não** deve rodar em Route Handlers. Opções:

1. Vercel Daemons (requer Docker, CLI ≥ 64.3.0 e conta com o recurso).
2. Container em outro host, apontando para o mesmo projeto Supabase.

Não faça deploy sem autorização.

## Retenção

`VETOR_RETENTION_DAYS` controla a exclusão de temporários e resultados antigos. Originais só são removidos se `VETOR_DELETE_ORIGINALS=true`.

## Observabilidade

O worker e as rotas emitem logs JSON com:

- `operation`
- `jobId`
- `status`
- `durationMs`
- `inputBytes`
- `outputBytes`
- `errorCode`

Use esses campos para taxa de sucesso, tempo e volume.
