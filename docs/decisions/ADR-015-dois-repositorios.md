# ADR-015 — Dois repositórios (API e front)

## Status

Aceito (supersede o monorepo de [ADR-001](ADR-001-stack.md) no que diz respeito a um único git)

## Contexto

Deploy (Hostinger Unlimited para o Next, API + Postgres à parte) e dois processos locais pedem git separados.

## Decisão

| Repo | URL | Conteúdo |
|------|-----|----------|
| **eaimesa-backend** | https://github.com/filiperamosds/eaimesa-backend | Fastify, Drizzle, Postgres, `packages/shared` (fonte), docs |
| **eaimesa-frontend** | https://github.com/filiperamosds/eaimesa-frontend | Next.js (um app: landing, painel, `/{slug}`, `/admin`) + cópia de `shared` |

Local: **dois terminais** — API `:4000`, front `:3000` (rewrite `/v1` → API). Front único continua [ADR-003](ADR-003-frontend-unico.md).

## Consequências

- Contrato compartilhado: mudar `packages/shared` nos **dois** repos.
- Cookies: o browser fala com `:3000`; o Next faz proxy. `APP_URL` no backend = origem do front.
- Este repositório (`eaimesa`) fica como arquivo do monorepo; código novo vai para os dois destinos.
