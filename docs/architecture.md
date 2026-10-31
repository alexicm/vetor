# Arquitetura do VETOR

O VETOR é um SaaS de conversão gráfica. A interface roda no navegador; os motores de conversão ficam em pacotes TypeScript independentes da UI.

## Visão geral

```
apps/web          Next.js App Router (UI + Route Handlers)
apps/worker       Consumidor da fila de conversão
packages/core     Motores: inspeção, raster, vetor, geometria, SVG, PDF
packages/contracts
                  Tipos e schemas Zod compartilhados
supabase/         Migrations, buckets e fila pgmq
```

A UI nunca executa Sharp, VTracer, resvg ou pdf-lib. Ela envia arquivos, cria jobs e acompanha o estado.

## Fluxo de um job

1. O cliente pede uma URL assinada (`POST /api/uploads/sign`).
2. O arquivo vai para um bucket privado (ou para o armazenamento local em desenvolvimento).
3. `POST /api/assets/complete` inspeciona o arquivo por assinatura e estrutura.
4. `POST /api/jobs` valida a operação, grava `conversion_jobs` e publica uma mensagem com IDs.
5. O worker lê a mensagem, baixa o original com credencial de serviço, processa e grava o resultado.
6. A UI consulta `GET /api/jobs/:id` por polling até `completed`, `failed` ou `cancelled`.

A mensagem da fila contém apenas identificadores. Nunca contém URLs públicas nem bytes.

## Modos de execução

| Modo | Quando | Auth | Storage | Fila |
| --- | --- | --- | --- | --- |
| `local` | Sem `NEXT_PUBLIC_SUPABASE_URL` ou `VETOR_RUNTIME=local` | Cookie + senha com scrypt | `.data/storage` | Arquivo local + processamento em processo |
| `supabase` | Credenciais configuradas | Supabase Auth | Buckets privados | `pgmq` (`conversion_jobs`) |

Os dois modos usam os mesmos motores em `packages/core`. Conversões nunca são simuladas.

## Motores

- **Inspeção**: magia de arquivo, Sharp, parser SVG e PDF.js.
- **Raster**: Sharp/libvips.
- **Vetorização**: `@visioncortex/vtracer` (WASM oficial).
- **Rasterização SVG**: `@resvg/resvg-js`.
- **Otimização SVG**: SVGO, depois sanitização.
- **Geometria**: bounding box visível e canvas.
- **PDF**: pdf-lib para documento; PDF.js para renderizar páginas.

## Processamento pesado

Tarefas pesadas (vetorização, PDFs grandes, imagens acima do limite leve) saem das rotas HTTP e vão para o worker.

Vercel Daemons existe na documentação oficial e exige Docker + CLI ≥ 64.3.0. Este ambiente tem CLI 62.2.0 e não tem Docker. O worker é um processo Node com Dockerfile, pronto para Daemon ou outro host quando a conta e o Docker estiverem disponíveis.

## Segurança

- RLS em toda tabela acessível.
- Buckets privados e URLs assinadas de curta duração.
- `service_role` só no servidor e no worker.
- Sanitização de SVG (sem script, eventos ou recursos externos perigosos).
- Limites: 50 MB, 100 megapixels, 30 páginas.
- Rate limit nas rotas sensíveis.
