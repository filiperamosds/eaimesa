# Arquitetura — overview

## Stack (MVP / fatia 1)

| Camada | Tecnologia | Motivo |
|--------|------------|--------|
| Monorepo | **pnpm workspaces** | web + api compartilham types |
| API | **Node.js + Fastify** | REST, cookies, plugins |
| DB | **PostgreSQL 16** | Transações; RLS depois |
| ORM | **Drizzle** | Migrations SQL, types |
| UI | **Next.js** (um app) | Landing + painel + cardápio |
| Auth dono | Cookie **httpOnly** `eaimesa_owner` | JWT assinado |
| Auth guest | Cookie `eaimesa_guest` | Fatia futura |
| Cache/fila | Redis | Fase 2 |

Ver [ADR-001](../decisions/ADR-001-stack.md), [ADR-003](../decisions/ADR-003-frontend-unico.md), [ADR-004](../decisions/ADR-004-slug-publico.md), [ADR-005](../decisions/ADR-005-kanban-pedidos.md).

## Monorepo

```
EaiMesa/
├── apps/
│   ├── api/          # Fastify REST
│   └── web/          # Next.js (único front)
├── packages/
│   ├── db/           # schema Drizzle, SQL, seed
│   └── shared/       # zod, slug, constantes
├── docs/
├── docker-compose.yml
└── .cursor/rules/    # docs-sync (atualizar specs)
```

Não existem `apps/guest` nem `apps/staff`.

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
| `/painel`, `/painel/cardapio`, `/painel/bar`, `/painel/pedidos` | Dono autenticado |
| `/{slug}` | Cardápio público |

## Integrações futuras

| Integração | Fase |
|------------|------|
| Asaas / Iugu (assinatura B2B) | MVP+ |
| Mercado Pago / Stripe BR (pagamento conta) | Depois |
| Agente ESC/POS local | Fase 2 |

## Ambientes

| Env | Uso |
|-----|-----|
| `local` | Docker Postgres + api + web |
| `staging` | Piloto 1 bar |
| `prod` | SaaS |

## Observabilidade (MVP mínimo)

- Logs estruturados JSON (sem PII completa)
- Health: `GET /health`
- Métricas básicas depois (pedidos/min, redeem falho)
