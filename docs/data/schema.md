# Modelo de dados

Convenções: UUID interno; `slug` kebab-case único; `public_id` string opaca 10–16 chars; timestamps UTC; dinheiro em **centavos** (`price_cents`).

## Entidades — fatia 1 (cardápio)

### Account

Login do dono.

- `id`, `email` UNIQUE, `password_hash`, `created_at`

### Venue

- `id`, `owner_account_id` → Account
- `name`, `slug` UNIQUE, `public_id` UNIQUE
- `subscription_status`: `trial` | `active` | `past_due` | `suspended`
- `accepts_orders`: bool (**false** enquanto o cliente não pede pelo slug)
- `created_at`, `updated_at`

Um account possui **um** venue no plano Bar (1:1). `VenueMember` entra quando houver staff.

### Cardápio

- **CatalogCategory** — `venue_id`, `name`, `sort_order`, `active`, timestamps
- **CatalogItem**
  - `venue_id`, `category_id`, `name`, `description`, `image_url` (http(s) ou `/v1/uploads/{uuid}.ext`)
  - `price_cents`, `sort_order`, `active`, `max_note_length` (default 80; UI na fatia pedido guest)

## Entidades — fatia 2 (pedidos)

### Order

- `id`, `venue_id`
- `status`: `pending` | `accepted` | `preparing` | `delivered` | `cancelled`
- `source`: `counter` | `guest` (`guest` reservado; fatia 2 só `counter`)
- `table_id` (nullable → VenueTable; fatia 3)
- `table_label` (snapshot, ex. "Mesa 4", "Balcão")
- `note`
- timestamps

### OrderItem

- `id`, `order_id`, `venue_id`
- `catalog_item_id` (nullable se o item do cardápio for apagado)
- `name_snapshot`, `unit_price_cents_snapshot`, `qty`, `note`

## Entidades — fatia 3 (mesas)

### VenueTable

- `id`, `venue_id`
- `label` (ex. "Mesa 4", "Balcão") — único por venue
- `sort_order`, `active`, timestamps

No máximo **15 mesas ativas** por venue (plano Bar). Pedido pode apontar `table_id` (nullable, `ON DELETE SET NULL`); `table_label` no pedido é snapshot.

## Entidades — fatia 4 (equipe + comanda)

### VenueMember

Garçom vinculado ao venue (mesmo login do painel).

- `id`, `venue_id` → Venue, `account_id` → Account
- `role`: `staff` (owner continua via `venues.owner_account_id`)
- `name`, `active`, timestamps

Máximo **5 membros staff ativos** por venue (plano Bar).

### Tab

Comanda da mesa.

- `id`, `venue_id`, `table_id` → VenueTable
- `status`: `open` | `locked` | `closed`
- `pin_hash` (bcrypt do PIN de 4 dígitos)
- timestamps

### TableClaim

Token de abertura (QR do garçom).

- `id`, `venue_id`, `table_id`
- `staff_account_id` ou `owner_account_id` (quem gerou)
- `token_hash` (SHA-256), `expires_at`
- `redeemed_at`, `invalidated_at`, `tab_id` (após redeem)
- timestamps

### GuestSession

Sessão do cliente após redeem.

- `id`, `venue_id`, `tab_id` → Tab
- `expires_at`, timestamps

Cookie `eaimesa_guest` referencia a sessão (JWT assinado).

## Entidades — planejadas

- **PlatformUser** — operador EaiMesa
- **VenueMember** — alternativa futura a StaffAccount + owner 1:1
- **AuditLog** — `venue_id`, `actor_type`, `actor_id`, `action`, `metadata_json`

## Índices críticos

- `venues(slug)` UNIQUE
- `venues(public_id)` UNIQUE
- `accounts(email)` UNIQUE
- `catalog_categories(venue_id, sort_order)`
- `catalog_items(venue_id, category_id)`
- `orders(venue_id, status, created_at)`
- `order_items(order_id)`
- `venue_tables(venue_id, sort_order)`
- `venue_tables(venue_id, label)` UNIQUE
- `venue_members(venue_id, account_id)` UNIQUE
- `venue_members(account_id)`
- `tabs(venue_id, table_id, status)`
- `table_claims(venue_id, table_id, token_hash)`
- `guest_sessions(tab_id, expires_at)`

## Regras de negócio

1. CRUD de catálogo e pedidos só com `venue_id` da sessão do dono.
2. Menu público: `active = true` em categoria e item.
3. DELETE categoria com itens → `CATEGORY_NOT_EMPTY`.
4. `OrderItem` sempre grava snapshot de preço/nome; o cliente **não** envia preço.
5. Pedido público pelo slug **não** existe nesta fatia.
6. Pedido de balcão com `table_id` só aceita mesa **ativa** do mesmo venue; grava snapshot do rótulo.
7. Fechar tab (futuro) → revoke sessions + claims pendentes.

## Diagrama ER

```mermaid
erDiagram
  Account ||--|| Venue : owns
  Venue ||--o{ CatalogCategory : has
  CatalogCategory ||--o{ CatalogItem : contains
  Venue ||--o{ CatalogItem : has
  Venue ||--o{ VenueTable : has
  Venue ||--o{ Order : has
  VenueTable ||--o{ Order : optional
  Order ||--|{ OrderItem : contains
```

## Postgres RLS (recomendado fase 1.5)

Política por `venue_id` em tabelas operacionais quando usar connection pool com `SET app.venue_id`.
