# ADR-016 — API Laravel + MySQL

## Status

Aceito (em paralelo ao Fastify/Postgres até o cutover). Stack Node: [ADR-001](ADR-001-stack.md). Dois git: [ADR-015](ADR-015-dois-repositorios.md).

## Contexto

Hospedagem típica (PHP + MySQL) e o pedido de um backend Laravel. O contrato HTTP (`docs/api/endpoints.md`) e o modelo (`docs/data/schema.md`) permanecem. O Fastify em `:4000` continua válido; o Laravel sobe em **outra pasta** (`eaimesa-laravel/`) na porta **8000**.

## Decisão

| Antes | Agora (Laravel) |
|-------|-----------------|
| Fastify + Drizzle | Laravel 13 (PHP 8.3) |
| PostgreSQL 16 | **MySQL 8** |
| Índices parciais `WHERE status = open` | Colunas geradas `STORED` + UNIQUE (NULL = fechado) |
| Cookie JWT HS256 | Mesmos nomes (`eaimesa_owner`, `eaimesa_guest`, `eaimesa_platform`) e claims |

Pasta: `eaimesa-laravel/`. Specs copiadas em `eaimesa-laravel/docs/`. Front único (ADR-003) não muda; `API_URL` no Next aponta para `:8000` quando for usar este backend.

## Consequências

- RLS do Postgres não existe no MySQL: tenancy continua só no `venue_id` da sessão.
- `packages/shared` (zod) não roda no PHP — regras reimplementadas em `app/Support`.
- Cutover: apontar o front para Laravel e desligar Fastify quando o checklist do contrato `/v1` estiver verde.
