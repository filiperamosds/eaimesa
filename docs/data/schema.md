# Modelo de dados

Convenções: UUID interno; `slug` kebab-case único; `public_id` string opaca 10–16 chars; timestamps UTC; dinheiro em **centavos** (`price_cents`).

## Entidades — fatia 1 (implementadas)

### Account

Login do dono.

- `id`, `email` UNIQUE, `password_hash`, `created_at`

### Venue

- `id`, `owner_account_id` → Account
- `name`, `slug` UNIQUE, `public_id` UNIQUE
- `subscription_status`: `trial` | `active` | `past_due` | `suspended`
- `accepts_orders`: bool (**false** na fatia 1)
- `created_at`, `updated_at`

Um account possui **um** venue no plano Bar (1:1). `VenueMember` entra quando houver staff.

### Cardápio

- **CatalogCategory** — `venue_id`, `name`, `sort_order`, `active`, timestamps
- **CatalogItem**
  - `venue_id`, `category_id`, `name`, `description`, `image_url` (http(s) ou `/v1/uploads/{uuid}.ext`)
  - `price_cents`, `sort_order`, `active`, `max_note_length` (default 80; UI na fatia pedido)

## Entidades — planejadas (não criar na fatia 1)

### Platform

- **PlatformUser** — operador EaiMesa.

### Tenant extra

- **VenueMember** — `user_id`, `venue_id`, `role`: `owner` | `staff`
- **Table** — `id`, `venue_id`, `label`, `sort_order`, `active`

### Comanda

- **Tab** — `status`: `open` | `locked` | `closed`; `pin_hash`
- **TableClaim** — `token_hash`, TTL, uso único
- **GuestSession** — `tab_id`, `expires_at`

### Pedidos

- **Order** / **OrderItem** (snapshot de nome e `unit_price_cents`)

### Auditoria

- **AuditLog** — `venue_id`, `actor_type`, `actor_id`, `action`, `metadata_json`

## Índices críticos (fatia 1)

- `venues(slug)` UNIQUE
- `venues(public_id)` UNIQUE
- `accounts(email)` UNIQUE
- `catalog_categories(venue_id, sort_order)`
- `catalog_items(venue_id, category_id)`

## Regras de negócio

1. CRUD de catálogo só com `venue_id` da sessão do dono.
2. Menu público: `active = true` em categoria e item.
3. DELETE categoria com itens → `CATEGORY_NOT_EMPTY`.
4. `OrderItem` (futuro) sempre grava snapshot de preço/nome.
5. Fechar tab (futuro) → revoke sessions + claims pendentes.

## Diagrama ER (fatia 1)

```mermaid
erDiagram
  Account ||--|| Venue : owns
  Venue ||--o{ CatalogCategory : has
  CatalogCategory ||--o{ CatalogItem : contains
  Venue ||--o{ CatalogItem : has
```

## Postgres RLS (recomendado fase 1.5)

Política por `venue_id` em tabelas operacionais quando usar connection pool com `SET app.venue_id`.
