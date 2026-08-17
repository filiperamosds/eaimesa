# Arquitetura — overview

## Stack proposta (MVP)

| Camada | Tecnologia | Motivo |
|--------|------------|--------|
| Monorepo | **pnpm workspaces** | guest + staff + api compartilham types |
| API | **Node.js + Fastify** (ou Nest se preferir) | REST, SSE/WebSocket leve |
| DB | **PostgreSQL 16** | Transações, RLS opcional |
| ORM | **Drizzle** ou **Prisma** | Migrations, types |
| Guest + Staff UI | **Next.js** (PWA) | SSR leve, uma codebase por app |
| Auth guest | Cookie **httpOnly** assinado | Sem token na URL |
| Auth staff | **JWT** Bearer ou cookie separado | RBAC |
| Cache/fila (fase 2) | Redis | Rate limit, pub/sub fila |

Ver [ADR-001](../decisions/ADR-001-stack.md).

## Monorepo (planejado)

```
EaiMesa/
├── apps/
│   ├── api/          # REST + SSE
│   ├── guest/        # PWA cliente (Next)
│   └── staff/        # Painel garçom/dono (Next)
├── packages/
│   ├── db/           # schema, migrations
│   ├── shared/       # types, validators (zod)
│   └── config/       # eslint, tsconfig
├── docs/
└── docker-compose.yml
```

Código ainda **não** scaffolded — só documentação neste commit inicial.

## Multi-tenant

- Toda entidade operacional tem `venue_id`.
- `venue_public_id` é o slug opaco na URL (`d1de031d33`).
- Guest session carrega `venue_id` + `tab_id` — nunca confiar no body.
- Staff JWT carrega `venue_id` + `role` (`owner` | `staff`).

## Integrações futuras

| Integração | Fase |
|------------|------|
| Asaas / Iugu (assinatura B2B) | MVP+ |
| Mercado Pago / Stripe BR (pagamento conta) | Depois |
| Agente ESC/POS local | Fase 2 |

## Ambientes

| Env | Uso |
|-----|-----|
| `local` | Docker Postgres + apps em dev |
| `staging` | Piloto 1 bar |
| `prod` | SaaS |

## Observabilidade (MVP mínimo)

- Logs estruturados JSON (sem PII completa)
- Health: `GET /health`
- Métricas básicas depois (pedidos/min, redeem falho)
