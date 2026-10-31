# Plano de implementação

Estado do repositório na inspeção inicial: diretório vazio, sem git, sem código.

## Decisões

- Monorepo pnpm com `apps/web`, `apps/worker`, `packages/core` e `packages/contracts`.
- UI permanece em `apps/web`.
- Runtime `local` para desenvolver e testar sem credenciais; runtime `supabase` quando as variáveis existirem.
- Worker Node + Dockerfile. Vercel Daemons documentado, não ativado.
- Polling de jobs no MVP.
- Pacote oficial `@visioncortex/vtracer`.

## Fases

| Fase | Escopo | Status |
| --- | --- | --- |
| 1 | Fundação, design system, auth, dashboard | Concluída |
| 2 | Upload, inspeção, storage, histórico de arquivos | Concluída |
| 3 | Sharp, resvg, VTracer, Geometry Engine | Concluída |
| 4 | PDF: visualizar, extrair, unir, rasterizar | Concluída |
| 5 | Filas, worker, retries, idempotência | Concluída (local + SQL pgmq) |
| 6 | Testes reais e fixtures | Concluída (Vitest dos motores) |
| 7 | Deploy docs, `.env.example`, smoke local | Em validação |

## Validação dos motores (Vitest)

10 testes passando, incluindo:

- PNG → JPG com fundo explícito
- SVG → PNG com largura correta
- PNG → SVG com `<path>` reais
- Centralização sem distorção
- Proporção preservada
- PDF extract/merge/reorder
- Arquivo inválido rejeitado
- SVG perigoso bloqueado

## Bloqueios conhecidos

- Sem credenciais Supabase neste ambiente. Auth/storage/fila remotas ficam prontas, mas não aplicadas a um projeto.
- Sem Docker: `supabase start` e Daemons locais indisponíveis.
- Vercel CLI 62.2.0; `vercel daemons` pede ≥ 64.3.0.
- Deploy e criação de serviços externos só com autorização explícita.
