# AGENTS.md

Convenções para agentes no repo EaiMesa. Produto e contratos: [`docs/`](docs/README.md). Setup: [`docs/ops/dev-setup.md`](docs/ops/dev-setup.md).

Um único front (`apps/web`). Spec e código mudam juntos (`.cursor/rules/docs-sync.mdc`).

## Cursor Cloud specific instructions

**Temporário até o MVP.** Quando o fluxo guest (pedir pelo cardápio) estiver completo, apague esta seção.

Não fazer teste manual de UI/desktop neste ambiente: browser, computerUse, screen recording, walkthrough em vídeo. Isso atrasa o ciclo e o Mac local cobre o QR/celular.

Validar no Cloud Agent com:

- `pnpm typecheck`
- `curl` contra a API (`:4000`) e, se o web estiver no ar, HTTP das rotas (status 200), sem abrir GUI

Pedido explícito do usuário (`/no-test` ou “sem teste”) prevalece.
