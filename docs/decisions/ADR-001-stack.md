# ADR-001: Stack e monorepo

**Status:** Aceito  
**Data:** 2026-08-17

## Contexto

SaaS multi-tenant, 3 PWAs, API REST, Postgres. Time pequeno; precisa entregar MVP rápido com tipos compartilhados.

## Decisão

- **Monorepo pnpm** com `apps/api`, `apps/guest`, `apps/staff`
- **TypeScript** end-to-end
- **PostgreSQL** + Drizzle (ou Prisma — escolher na scaffold)
- **Next.js** para frontends (PWA, installable)
- **Fastify** para API (performance, plugins)

## Alternativas consideradas

| Opção | Prós | Contras |
|-------|------|---------|
| Repos separados | Deploy isolado | Types duplicados, drift |
| Go API | Performance | Dois ecossistemas TS/Go |
| Supabase-only | Rápido | RLS + custom claim flow menos flexível |

## Consequências

- Um PR pode cruzar API + UI
- Deploy pode ser Vercel (front) + Fly/Railway (API) + Neon/RDS (DB)
