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

## Implementado (fatias 1–5)

### Saúde

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | — | Liveness (fora de `/v1`) |

### Auth estabelecimento (dono e garçom)

Cookie: `eaimesa_owner` (httpOnly, SameSite=Lax, Path=/). JWT inclui `role: owner | staff`.

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/v1/auth/register` | — | Cria account + venue (role owner); Set-Cookie |
| POST | `/v1/auth/login` | — | E-mail/senha; owner ou staff; Set-Cookie + `redirectPath` |
| POST | `/v1/auth/logout` | Cookie | Clear-Cookie |
| GET | `/v1/auth/me` | Cookie | `role`, account, venue; `member` se staff |

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
  "tableId": "uuid",
  "tableLabel": "Mesa 4",
  "note": "sem gelo",
  "items": [
    { "catalogItemId": "uuid", "qty": 2, "note": null }
  ]
}
```

`source` gravado como `counter`. Status inicial `pending`. `tableId` (fatia 3) resolve o rótulo da mesa ativa; `tableLabel` continua aceito se o bar ainda não cadastrou mesas. Um dos dois é obrigatório.

### Owner — mesas (fatia 3)

Auth: cookie `eaimesa_owner`. `venue_id` da sessão. Limite: 15 mesas **ativas**.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/owner/tables` | Todas as mesas (inclui inativas) |
| POST | `/v1/owner/tables` | `{ label, sortOrder? }` |
| PATCH | `/v1/owner/tables/{id}` | `{ label?, sortOrder?, active? }` |
| DELETE | `/v1/owner/tables/{id}` | Remove; pedidos ficam com snapshot do rótulo |

#### POST /v1/owner/tables (body)

```json
{ "label": "Mesa 4", "sortOrder": 4 }
```

Rótulo único por venue. `TABLE_LIMIT` se já houver 15 ativas. `TABLE_LABEL_TAKEN` se o nome já existir.

### Owner — equipe / garçons (fatia 4)

Auth: cookie `eaimesa_owner`. Limite: **5 garçons ativos**.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/owner/staff` | Lista garçons + contagem ativa |
| POST | `/v1/owner/staff` | `{ name, email, password }` |
| PATCH | `/v1/owner/staff/{id}` | `{ name?, active?, password? }` |
| DELETE | `/v1/owner/staff/{id}` | Remove garçom |

### Auth garçom

Removido login separado. Garçom usa `/v1/auth/login` e `/v1/auth/me` (ver acima).

### Staff — mesas e claim (fatia 4)

Auth: cookie com `role: owner | staff`.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/staff/tables` | Mesas ativas do venue |
| POST | `/v1/staff/tables/{tableId}/claims` | Gera claim (TTL, uso único) |

Resposta do claim:

```json
{
  "claimId": "uuid",
  "tableId": "uuid",
  "tableLabel": "Mesa 4",
  "claimUrl": "http://mac-filipe.local:3000/bar-do-tiao/c/{token}",
  "expiresAt": "2026-…",
  "expiresInSeconds": 180
}
```

### Público — redeem claim (fatia 4)

Cookie guest: `eaimesa_guest`.

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/v1/public/venues/{slug}/c/{token}/redeem` | — | Abre tab, PIN, Set-Cookie guest |

Resposta:

```json
{
  "pinDisplay": "4821",
  "tableLabel": "Mesa 4",
  "slug": "bar-do-tiao",
  "redirectPath": "/bar-do-tiao/bem-vindo"
}
```

Front: `/{slug}/c/{token}` chama redeem e redireciona; `/{slug}/bem-vindo` exibe PIN.

### Guest — PIN join (fatia 5)

Cookie guest: `eaimesa_guest`. Sem cookie no join; o PIN abre sessão no segundo aparelho.

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/v1/guest/tabs/join` | — | Body `{ slug, pin }`; Set-Cookie guest |
| GET | `/v1/guest/tab` | Cookie guest | Tab atual (mesa, slug) |

#### POST /v1/guest/tabs/join (body)

```json
{ "slug": "bar-do-tiao", "pin": "4821" }
```

PIN: exatamente 4 dígitos. Casa com uma tab `open` do venue. Resposta:

```json
{
  "tableLabel": "Mesa 4",
  "slug": "bar-do-tiao",
  "redirectPath": "/bar-do-tiao"
}
```

Erros: `PIN_INVALID` (401), `PIN_LOCKED` (429, 5 falhas / 15 min / IP+venue), `VENUE_NOT_FOUND` (404).

Front: `/{slug}/entrar`.

#### PATCH /v1/owner/orders/{id}

```json
{ "status": "accepted" }
```

Valores: `pending` | `accepted` | `preparing` | `delivered` | `cancelled`.

## Planejado (fatias seguintes)

Não implementar agora. Mantido para não perder o contrato do MVP.

### Guest / comanda (parcial — fatia 5 fez join + GET tab)

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/v1/guest/orders` | Cookie guest | Header `Idempotency-Key` |
| GET | `/v1/guest/orders/{id}` | Cookie guest | Status |

Preço **não** enviado pelo cliente no pedido.

### Staff (além do claim — fatia 4)

Auth: cookie `eaimesa_staff`.

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/v1/staff/orders` | staff | Fila (hoje: `/v1/owner/orders`) |
| PATCH | `/v1/staff/orders/{id}` | staff | `{ status }` |
| POST | `/v1/staff/tabs/{tabId}/lock` | staff | Trava tab |
| POST | `/v1/staff/tabs/{tabId}/close` | owner/staff | Fecha conta |
| GET | `/v1/staff/orders/stream` | staff | SSE |

### Owner (além do catálogo)

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/v1/owner/staff/invites` | Convite staff (futuro) |

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
| `TABLE_NOT_FOUND` | 404 |
| `TABLE_LIMIT` | 409 |
| `TABLE_LABEL_TAKEN` | 409 |
| `EMAIL_TAKEN` | 409 |
| `VENUE_SUSPENDED` | 403 |
| `CLAIM_EXPIRED` | 410 |
| `CLAIM_ALREADY_USED` | 409 |
| `PIN_INVALID` | 401 |
| `PIN_LOCKED` | 429 |
| `TAB_ALREADY_OPEN` | 409 |
| `STAFF_NOT_FOUND` | 404 |
| `STAFF_LIMIT` | 409 |
| `STAFF_INACTIVE` | 403 |
| `CLAIM_INVALID` | 404 |
| `TAB_CLOSED` | 409 |
| `FORBIDDEN_CROSS_VENUE` | 403 |

OpenAPI: gerar em `apps/api/openapi.yaml` quando o contrato da fatia 1 estabilizar.
