# AGENTS.md

Convenções para agentes no repo EaiMesa. Produto e contratos: [`docs/`](docs/README.md). Setup: [`docs/ops/dev-setup.md`](docs/ops/dev-setup.md).

Um único front (`apps/web`). Spec e código mudam juntos (`.cursor/rules/docs-sync.mdc`).

## Cursor Cloud specific instructions

Não fazer teste manual de UI/desktop neste ambiente: browser, computerUse, screen recording. O Mac local cobre QR/celular.

Validar no Cloud Agent com `pnpm typecheck` e `curl` contra a API (`:4000`). Pedido explícito (`/no-test`) prevalece.
