# Testes

## Unitários e de integração (Vitest)

```bash
pnpm test
```

Os testes de `packages/core` executam Sharp, resvg, VTracer, SVGO e pdf-lib de verdade. Fixtures em `tests/fixtures`.

Para gerar as fixtures:

```bash
pnpm fixtures
```

## Aceitação coberta

- PNG → JPG com fundo configurado
- SVG → PNG com dimensões corretas
- PNG → SVG com `<path>` reais (sem `<image>` embutida)
- Centralização sem distorção
- Proporção preservada
- PDF split/merge na ordem correta
- Arquivo inválido rejeitado
- SVG perigoso sanitizado

## Playwright

```bash
pnpm test:e2e
```

Cobre cadastro, login, upload e acompanhamento de um job real em modo local.

## Convenções

- Não mockar motores gráficos.
- Não desligar typecheck, lint ou testes para esconder erro.
- Falha de conversão deve aparecer como `failed` com mensagem clara.
