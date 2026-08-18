# API — REST

Base: `https://api.eaimesa.com.br/v1` (local: `http://localhost:4000/v1`).

Formato: JSON. Erros:

```json
{
  "error": {
    "code": "VENUE_NOT_FOUND",
    "message": "Este cardápio não existe."
  }
}
```

CORS: origin explícita do único front (`APP_URL`), `credentials: true`.

## Implementado (fatia 1 — cardápio)

### Saúde

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | — | Liveness (fora de `/v1`) |

### Auth estabelecimento

Cookie: `eaimesa_owner` (httpOnly, SameSite=Lax, Path=/).

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/v1/auth/register` | — | Cria account + venue; Set-Cookie |
| POST | `/v1/auth/login` | — | E-mail/senha; Set-Cookie |
| POST | `/v1/auth/logout` | Cookie | Clear-Cookie |
| GET | `/v1/auth/me` | Cookie | Account + venue atuais |

#### POST /v1/auth/register (body)

```json
{
  "email": "dono@bar.com",
  "password": "mínimo 8 chars",
  "venueName": "Bar do Tião",
  "slug": "bar-do-tiao"
}
```

#### POST /v1/auth/login (body)

```json
{ "email": "dono@bar.com", "password": "..." }
```

### Público — cardápio

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/v1/public/venues/{slug}` | — | Venue + categorias ativas + itens ativos |

Itens inativos e categorias inativas **não** entram na resposta pública. Venue `suspended`: ainda retorna o cardápio com `subscriptionStatus` para o front avisar.

### Owner — venue e catálogo

Auth: cookie `eaimesa_owner`. Todas as queries filtram pelo `venue_id` da sessão.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/owner/venue` | Nome, slug, public_id, status |
| PATCH | `/v1/owner/venue` | `{ name?, slug? }` |
| GET | `/v1/owner/catalog` | Categorias + itens (inclui inativos) |
| POST | `/v1/owner/catalog/categories` | `{ name, sortOrder? }` |
| PATCH | `/v1/owner/catalog/categories/{id}` | `{ name?, sortOrder?, active? }` |
| DELETE | `/v1/owner/catalog/categories/{id}` | 409 se ainda houver itens |
| POST | `/v1/owner/catalog/items` | ver body abaixo |
| PATCH | `/v1/owner/catalog/items/{id}` | campos parciais |
| POST | `/v1/owner/catalog/items/{id}/image` | multipart `file` (JPG/PNG/WebP, máx. 2 MB) |
| DELETE | `/v1/owner/catalog/items/{id}` | remove item |
| GET | `/v1/uploads/{file}` | — | Foto enviada (público, nome UUID) |

#### POST /v1/owner/catalog/items (body)

```json
{
  "categoryId": "uuid",
  "name": "Calabresa acebolada",
  "description": "Serve 2",
  "imageUrl": "https://exemplo.com/calabresa.jpg",
  "priceCents": 3290,
  "sortOrder": 0,
  "active": true
}
```

`imageUrl` é opcional. Upload no painel grava um path `/v1/uploads/...` no mesmo campo. O menu público devolve `imageUrl` em cada item.

Preço **sempre** em centavos no servidor. O cliente do painel converte reais → cents.

### Owner — pedidos (fatia 2)

Auth: cookie `eaimesa_owner`. `venue_id` da sessão.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/owner/orders` | Pedidos do venue (sem `cancelled`, 48 h) |
| POST | `/v1/owner/orders` | Pedido de balcão; snapshot de preço |
| PATCH | `/v1/owner/orders/{id}` | `{ status }` |

#### POST /v1/owner/orders (body)

```json
{
  "tableLabel": "Mesa 4",
  "note": "sem gelo",
  "items": [
    { "catalogItemId": "uuid", "qty": 2, "note": null }
  ]
}
```

`source` gravado como `counter`. Status inicial `pending`.

#### PATCH /v1/owner/orders/{id}

```json
{ "status": "accepted" }
```

Valores: `pending` | `accepted` | `preparing` | `delivered` | `cancelled`.

## Planejado (fatias seguintes)

Não implementar na fatia 1. Mantido para não perder o contrato do MVP.

### Guest / comanda

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/v1/public/venues/{slug}/c/{token}/redeem` | — | Abre tab, Set-Cookie guest |
| POST | `/v1/guest/tabs/join` | — | Body `{ slug, pin }` |
| GET | `/v1/guest/tab` | Cookie guest | Tab atual |
| POST | `/v1/guest/orders` | Cookie guest | Header `Idempotency-Key` |
| GET | `/v1/guest/orders/{id}` | Cookie guest | Status |

Preço **não** enviado pelo cliente no pedido.

### Staff

Auth futura: cookie `eaimesa_staff` ou Bearer. Rotas no **mesmo** `apps/web` (`/painel/...`).

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/v1/staff/orders` | staff | Fila (hoje: `/v1/owner/orders`) |
| PATCH | `/v1/staff/orders/{id}` | staff | `{ status }` |
| POST | `/v1/staff/tables/{tableId}/claims` | staff | Gera claim |
| POST | `/v1/staff/tabs/{tabId}/lock` | staff | Trava tab |
| POST | `/v1/staff/tabs/{tabId}/close` | owner/staff | Fecha conta |
| GET | `/v1/staff/orders/stream` | staff | SSE |

### Owner (além do catálogo)

| Método | Path | Descrição |
|--------|------|-----------|
| CRUD | `/v1/owner/tables/**` | Mesas |
| POST | `/v1/owner/staff/invites` | Convite staff |

### Platform (futuro)

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/platform/venues` | Lista tenants |
| POST | `/v1/platform/venues/{id}/suspend` | Suspende |

### Webhooks (futuro)

- `POST /v1/webhooks/asaas` — assinatura B2B (HMAC)

## Códigos de erro (amostra)

| Code | HTTP |
|------|------|
| `VALIDATION_ERROR` | 400 |
| `UNAUTHORIZED` | 401 |
| `VENUE_NOT_FOUND` | 404 |
| `SLUG_TAKEN` | 409 |
| `SLUG_RESERVED` | 400 |
| `CATEGORY_NOT_EMPTY` | 409 |
| `ORDER_NOT_FOUND` | 404 |
| `EMAIL_TAKEN` | 409 |
| `VENUE_SUSPENDED` | 403 |
| `CLAIM_EXPIRED` | 410 |
| `CLAIM_ALREADY_USED` | 409 |
| `PIN_INVALID` | 401 |
| `PIN_LOCKED` | 429 |
| `TAB_CLOSED` | 409 |
| `FORBIDDEN_CROSS_VENUE` | 403 |

OpenAPI: gerar em `apps/api/openapi.yaml` quando o contrato da fatia 1 estabilizar.
