# EaiMesa

SaaS B2B para bares e restaurantes pequenos: cardápio no celular do cliente e, no MVP completo, comanda com QR do garçom.

**URL pública (fatia 1):** `https://eaimesa.com.br/bar-do-tiao`

Um único frontend: landing, autenticação do estabelecimento e cardápio por slug. API Fastify à parte.

## Fatia atual

[Cardápio](docs/product/fatia-01-cardapio.md) — sem pedido e sem garçom.

```bash
cp .env.example .env
pnpm install
# Postgres 16 — ver docs/ops/dev-setup.md
# Cursor Cloud: bash scripts/cursor-cloud/install.sh && bash scripts/cursor-cloud/start.sh
# Mac: Homebrew  |  ou: docker compose up -d postgres
pnpm db:migrate && pnpm db:seed
pnpm dev
```

- Site: http://localhost:3000
- Cardápio demo: http://localhost:3000/bar-do-tiao
- Painel: http://localhost:3000/painel (seed: `dono@bardotiao.local` / `demo1234`)

Setup completo: [docs/ops/dev-setup.md](docs/ops/dev-setup.md).

## Documentação

Índice: [`docs/`](docs/README.md).

| Área | Arquivo |
|------|---------|
| Fatia 1 | [docs/product/fatia-01-cardapio.md](docs/product/fatia-01-cardapio.md) |
| Produto | [docs/product/visao.md](docs/product/visao.md) |
| Fluxos | [docs/product/fluxos.md](docs/product/fluxos.md) |
| Preço | [docs/product/pricing.md](docs/product/pricing.md) |
| Arquitetura | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Sessão (claim + PIN) | [docs/architecture/sessao-claim-pin.md](docs/architecture/sessao-claim-pin.md) |
| Segurança | [docs/security/modelo.md](docs/security/modelo.md) |
| API | [docs/api/endpoints.md](docs/api/endpoints.md) |
| Dados | [docs/data/schema.md](docs/data/schema.md) |
| Setup | [docs/ops/dev-setup.md](docs/ops/dev-setup.md) |
| ADRs | [docs/decisions/](docs/decisions/) |

## Canvas do Cursor vs este repo

Arquivos `.canvas.tsx` da conversa no Cursor **não ficam aqui**. O conteúdo está em `docs/`.
