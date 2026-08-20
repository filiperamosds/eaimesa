# EaiMesa

SaaS B2B para bares e restaurantes pequenos: cardápio no celular do cliente e, no MVP completo, comanda com QR do garçom.

**URL pública (fatia 1):** `https://eaimesa.com.br/bar-do-tiao`

Um único frontend: landing, autenticação do estabelecimento e cardápio por slug. API Fastify à parte.

## Fatia atual

[Cardápio](docs/product/fatia-01-cardapio.md) … [PIN join](docs/product/fatia-05-pin-join.md) e [comandas individuais](docs/product/fatia-06-comandas-individuais.md).

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
- Pedidos: http://localhost:3000/painel/pedidos
- Mesas: http://localhost:3000/painel/mesas
- Equipe (garçons): http://localhost:3000/painel/equipe
- App garçom: http://localhost:3000/garcom
- PIN join (outros celulares): http://localhost:3000/bar-do-tiao/entrar
- Comanda (nome/telefone): http://localhost:3000/bar-do-tiao/comanda
- Painel: `dono@bardotiao.local` / `demo1234` (seed local)
- Garçom demo: `garcom@bardotiao.local` / `demo1234`

Setup completo: [docs/ops/dev-setup.md](docs/ops/dev-setup.md).

## Documentação

Índice: [`docs/`](docs/README.md).

| Área | Arquivo |
|------|---------|
| Fatia 1 | [docs/product/fatia-01-cardapio.md](docs/product/fatia-01-cardapio.md) |
| Fatia 2 | [docs/product/fatia-02-pedidos.md](docs/product/fatia-02-pedidos.md) |
| Fatia 3 | [docs/product/fatia-03-mesas.md](docs/product/fatia-03-mesas.md) |
| Fatia 4 | [docs/product/fatia-04-claim-garcom.md](docs/product/fatia-04-claim-garcom.md) |
| Fatia 5 | [docs/product/fatia-05-pin-join.md](docs/product/fatia-05-pin-join.md) |
| Fatia 6 | [docs/product/fatia-06-comandas-individuais.md](docs/product/fatia-06-comandas-individuais.md) |
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
