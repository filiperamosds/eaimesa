# Arquitetura — overview

## Stack (MVP / fatia 1)

| Camada | Tecnologia | Motivo |
|--------|------------|--------|
| Git | **Dois repos** ([ADR-015](../decisions/ADR-015-dois-repositorios.md)) | API e Next sobem em processos/deploys separados |
| Workspaces | **pnpm** em cada repo | API: `apps/api` + `packages/*`; front: Next + cópia de `shared` |
| API | **Node.js + Fastify** *ou* **Laravel 13** ([ADR-016](../decisions/ADR-016-laravel-mysql.md)) | REST, cookies |
| DB | **PostgreSQL 16** (Fastify) ou **MySQL 8** (Laravel) | Transações |
| ORM | **Drizzle** (Fastify) / Eloquent (Laravel) | Migrations SQL, types |
| UI | **Next.js** (um app) | Landing + painel + cardápio |
| Auth dono | Cookie **httpOnly** `eaimesa_owner` | JWT assinado |
| Auth guest | Cookie `eaimesa_guest` | Redeem (fatia 4) e PIN join (fatia 5) |
| Auth platform | Cookie **httpOnly** `eaimesa_platform` | JWT próprio (`PLATFORM_JWT_SECRET`) |
| Cache/fila | Redis | Fase 2 |

Ver [ADR-001](../decisions/ADR-001-stack.md), [ADR-003](../decisions/ADR-003-frontend-unico.md), [ADR-004](../decisions/ADR-004-slug-publico.md), [ADR-005](../decisions/ADR-005-kanban-pedidos.md), [ADR-006](../decisions/ADR-006-mesas.md), [ADR-014](../decisions/ADR-014-plan-kind-promo.md), [ADR-015](../decisions/ADR-015-dois-repositorios.md), [ADR-016](../decisions/ADR-016-laravel-mysql.md).

## Repositórios

```
eaimesa-backend/          # https://github.com/filiperamosds/eaimesa-backend
├── apps/api/             # Fastify REST (:4000)
├── packages/db/          # schema Drizzle, SQL, seed
├── packages/shared/      # fonte de verdade (zod, slug, planos)
├── docs/
└── docker-compose.yml

eaimesa-frontend/         # https://github.com/filiperamosds/eaimesa-frontend
├── app/                  # Next.js único (:3000)
├── packages/shared/      # cópia — sincronizar com o backend
└── next.config.ts        # rewrite /v1 → API_URL

eaimesa-laravel/          # Laravel + MySQL (ADR-016) — :8000; neste monorepo
├── app/                  # controllers, models, JWT cookies
├── database/migrations/  # schema MySQL
└── docs/                 # cópia do contrato /v1
```

Não existem `apps/guest` nem `apps/staff`. Este monorepo (`filiperamosds/eaimesa`) espelha o conjunto; o dia a dia é nos dois repos GitHub. Laravel fica nesta pasta até o cutover.

## Multi-tenant

- Toda entidade operacional tem `venue_id`.
- URL pública do cardápio: `venue.slug` (`bar-do-tiao`).
- `venue.public_id` é opaco e estável (uso interno / claims futuros).
- Sessão do dono carrega `account_id` + `venue_id` + `role=owner` — nunca confiar no body para tenancy.
- Staff JWT (futuro) carrega `venue_id` + `role` (`owner` | `staff`).

## Rotas do front

| Path | App |
|------|-----|
| `/` | Landing SaaS |
| `/cadastro`, `/login` | Auth estabelecimento |
| `/painel` | Redirect pedidos ou cardápio conforme o plano |
| `/painel/pedidos` | Kanban do dono (Auto atendimento) |
| `/painel/cardapio`, `/painel/mesas`, `/painel/bar` | Cardápio, salão e dados do bar |
| `/painel/pagamento` | Checkout stub |
| `/{slug}` | Cardápio público (pedido/PIN só no Auto atendimento) |
| `/{slug}/c/{token}` | Redeem do claim (redirect se plano Cardápio) |
| `/{slug}/bem-vindo` | PIN no primeiro aparelho |
| `/{slug}/entrar` | PIN join (redirect se plano Cardápio) |
| `/{slug}/comanda` | Nome + telefone **ou** parcial da comanda |
| `/garcom` | Mesas do garçom |
| `/garcom/pedidos` | Kanban do garçom |
| `/admin/login`, `/admin` | Console da plataforma (operador) |
| `/admin/bares`, `/admin/planos` | Tenants e catálogo |

## Integrações futuras

| Integração | Fase |
|------------|------|
| Asaas / Iugu (assinatura B2B) | MVP+ |
| Mercado Pago / Stripe BR (pagamento conta) | Depois |
| Agente ESC/POS local | Fase 2 |

## Ambientes

| Env | Uso |
|-----|-----|
| `local` | Postgres 16 + **dois terminais**: backend `:4000`, frontend `:3000` |
| `cursor-cloud` | Postgres 16 nativo (apt) via `.cursor/environment.json`; sem Docker |
| `staging` | Piloto 1 bar |
| `prod` | SaaS |

Setup: [docs/ops/dev-setup.md](../ops/dev-setup.md).

## Observabilidade (MVP mínimo)

- Logs estruturados JSON (sem PII completa)
- Health: `GET /health`
- Métricas básicas depois (pedidos/min, redeem falho)
