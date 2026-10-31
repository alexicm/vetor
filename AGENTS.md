# Convenções do VETOR

## Idioma

Interface, erros e documentação para o usuário: português brasileiro.

## Fronteiras

- `packages/core`: motores e execução de jobs. Sem React.
- `packages/contracts`: Zod e tipos.
- `apps/web`: UI e Route Handlers.
- `apps/worker`: consumidor da fila.

Não coloque Sharp, VTracer, resvg ou pdf-lib em componentes React.

## Runtime

- Sem Supabase: `VETOR_RUNTIME=local` e armazenamento em `.data/`.
- Com credenciais: `VETOR_RUNTIME=supabase`.
- Conversões nunca são simuladas.

## Next.js 16

- `proxy.ts` no lugar de `middleware.ts`.
- `cookies()`, `headers()` e `params` são assíncronos.
- Use `after()` para disparar processamento sem prender a resposta HTTP.

## Segurança

- Validar arquivo por assinatura, não só pela extensão.
- Sanitizar SVG.
- RLS em todas as tabelas públicas.
- Service role só no servidor e no worker.

## Testes

Os testes de `packages/core` executam os motores de verdade. Não mocke conversão gráfica.
