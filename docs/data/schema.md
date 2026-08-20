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

## Entidades — fatia 6 (comandas individuais)

### TableSession

Ocupação da mesa + PIN do grupo.

- `id`, `venue_id`, `table_id` → VenueTable
- `pin_hash` (bcrypt, 4 dígitos)
- `status`: `open` | `closed`
- `closed_at`, timestamps

No máximo **uma** sessão `open` por mesa.

### Tab (comanda pessoal)

- `id`, `venue_id`, `table_id`, `table_session_id` → TableSession
- `guest_name`, `guest_phone` (só dígitos)
- `status`: `open` | `closed`
- `closed_at`, timestamps

Várias tabs `open` por sessão. Telefone único entre as `open` da mesma sessão (retoma a conta noutro aparelho).

### TableClaim

Como na fatia 4; `table_session_id` preenchido no redeem. **Não** cria a tab pessoal.

### GuestSession

- `id`, `venue_id`, `table_session_id` (obrigatório)
- `tab_id` (nullable até nome+telefone)
- `expires_at`, timestamps

### Order

- `tab_id` nullable → Tab (parcial da pessoa; `guest` na fatia seguinte; balcão pode ficar só na mesa)

## Entidades — planejadas

- **PlatformUser** — operador EaiMesa
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
- `table_sessions(table_id) WHERE status = open` UNIQUE
- `tabs(table_session_id, guest_phone) WHERE status = open` UNIQUE
- `guest_sessions(table_session_id, tab_id)`

## Regras de negócio

1. CRUD de catálogo e pedidos só com `venue_id` da sessão do dono.
2. Menu público: `active = true` em categoria e item.
3. DELETE categoria com itens → `CATEGORY_NOT_EMPTY`.
4. `OrderItem` sempre grava snapshot de preço/nome; o cliente **não** envia preço.
5. Pedido público pelo slug ainda não existe (carrinho = fatia seguinte).
6. Pedido de balcão com `table_id` só aceita mesa **ativa** do mesmo venue; grava snapshot do rótulo.
7. PIN join casa o PIN com uma **TableSession** `open`.
8. Nome+telefone abre ou retoma comanda pessoal na sessão.
9. Encerrar mesa só se todas as comandas da sessão estão `closed`. Revoga sessões da comanda ao fechá-la.

## Diagrama ER

```mermaid
erDiagram
  Account ||--|| Venue : owns
  Account ||--o{ VenueMember : staff
  Venue ||--o{ VenueMember : has
  Venue ||--o{ CatalogCategory : has
  CatalogCategory ||--o{ CatalogItem : contains
  Venue ||--o{ VenueTable : has
  VenueTable ||--o{ TableSession : occupancy
  TableSession ||--o{ Tab : comandas
  Tab ||--o{ GuestSession : devices
  Tab ||--o{ Order : parcial
  Venue ||--o{ Order : has
  Order ||--|{ OrderItem : contains
```

## Diagrama ER

```mermaid
erDiagram
  Account ||--|| Venue : owns
  Account ||--o{ VenueMember : staff
  Venue ||--o{ VenueMember : has
  Venue ||--o{ CatalogCategory : has
  CatalogCategory ||--o{ CatalogItem : contains
  Venue ||--o{ CatalogItem : has
  Venue ||--o{ VenueTable : has
  Venue ||--o{ Order : has
  VenueTable ||--o{ Order : optional
  Order ||--|{ OrderItem : contains
  Venue ||--o{ Tab : has
  VenueTable ||--o{ Tab : hosts
  Tab ||--o{ GuestSession : sessions
  Tab ||--o{ TableClaim : opened_by
```

## Postgres RLS (recomendado fase 1.5)

Política por `venue_id` em tabelas operacionais quando usar connection pool com `SET app.venue_id`.
