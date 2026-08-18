# ADR-001: Stack e monorepo

**Status:** Aceito (frontends: ver [ADR-003](ADR-003-frontend-unico.md))  
**Data:** 2026-08-17

## Contexto

SaaS multi-tenant, API REST, Postgres. Time pequeno; precisa entregar MVP rápido com tipos compartilhados. A quantidade de apps web foi revista na fatia 1: **um** Next.js, não guest + staff separados.

## Decisão

- **Monorepo pnpm** com `apps/api` (Fastify) e `apps/web` (Next.js único)
- **TypeScript** end-to-end
- **PostgreSQL 16** + **Drizzle**
- **Next.js** App Router para landing, painel do estabelecimento e cardápio público
- **Fastify** para API (REST)

## Alternativas consideradas

| Opção | Prós | Contras |
|-------|------|---------|
| Repos separados | Deploy isolado | Types duplicados, drift |
| Go API | Performance | Dois ecossistemas TS/Go |
| Supabase-only | Rápido | RLS + custom claim flow menos flexível |

## Consequências

- Um PR pode cruzar API + UI
- Deploy: um front (Vercel ou similar) + Fly/Railway (API) + Neon/RDS (DB)
- Guest PWA e painel staff **não** são apps separados; entram como rotas em `apps/web` (ADR-003)
