# EaiMesa

SaaS B2B para bares e restaurantes pequenos: cardápio no celular do cliente e, no MVP completo, comanda com QR do garçom.

O desenvolvimento ativo está em **dois repositórios** ([ADR-015](docs/decisions/ADR-015-dois-repositorios.md)):

| Repo | O que é | Terminal local |
|------|---------|----------------|
| [eaimesa-backend](https://github.com/filiperamosds/eaimesa-backend) | Fastify + Postgres + `packages/shared` | `pnpm dev` → http://localhost:4000 |
| [eaimesa-frontend](https://github.com/filiperamosds/eaimesa-frontend) | Next.js (landing, painel, `/{slug}`, `/admin`) | `pnpm dev` → http://localhost:3000 |

Este monorepo permanece como arquivo. Front único (um app Next) e contrato HTTP não mudam.

Backend Laravel + MySQL (em paralelo, neste monorepo): pasta [`eaimesa-laravel/`](eaimesa-laravel/README.md) ([ADR-016](docs/decisions/ADR-016-laravel-mysql.md)). `php artisan serve --port=8000`.

**URL pública (fatia 1):** `https://eaimesa.com.br/bar-do-tiao`

## Fatia atual

[Cardápio](docs/product/fatia-01-cardapio.md) … [planos](docs/product/fatia-10-planos.md) e [console SaaS](docs/product/fatia-11-console-saas.md).

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
- Cardápio demo (Auto atendimento): http://localhost:3000/bar-do-tiao
- Cardápio demo (só Cardápio): http://localhost:3000/cafe-da-lina
- Pedidos: http://localhost:3000/painel/pedidos
- Mesas: http://localhost:3000/painel/mesas
- Equipe (garçons): http://localhost:3000/painel/equipe
- App garçom: http://localhost:3000/garcom
- Fila do garçom: http://localhost:3000/garcom/pedidos
- PIN join (outros celulares): http://localhost:3000/bar-do-tiao/entrar
- Comanda / parcial: http://localhost:3000/bar-do-tiao/comanda
- Pagamento (stub): http://localhost:3000/painel/pagamento
- Console SaaS: http://localhost:3000/admin
- Painel Auto atendimento: `dono@bardotiao.local` / `demo1234`
- Painel Cardápio: `dono@cafedalina.local` / `demo1234`
- Garçom demo: `garcom@bardotiao.local` / `demo1234`
- Operador: `ops@eaimesa.local` / `demo1234`

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
| Fatia 7 | [docs/product/fatia-07-pedido-guest.md](docs/product/fatia-07-pedido-guest.md) |
| Fatia 8 | [docs/product/fatia-08-fila-garcom.md](docs/product/fatia-08-fila-garcom.md) |
| Fatia 9 | [docs/product/fatia-09-parcial-guest.md](docs/product/fatia-09-parcial-guest.md) |
| Fatia 10 | [docs/product/fatia-10-planos.md](docs/product/fatia-10-planos.md) |
| Fatia 11 | [docs/product/fatia-11-console-saas.md](docs/product/fatia-11-console-saas.md) |
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
