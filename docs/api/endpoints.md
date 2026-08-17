# API — esboço REST

Base: `https://api.eaimesa.com.br/v1` (local: `http://localhost:4000/v1`).

Formato: JSON. Erros:

```json
{
  "error": {
    "code": "CLAIM_EXPIRED",
    "message": "Este QR expirou. Peça ao garçom um novo."
  }
}
```

## Público / Guest

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/v/{venuePublicId}` | — | Meta + cardápio (read-only sem sessão) |
| POST | `/v/{venuePublicId}/c/{token}/redeem` | — | Abre tab, Set-Cookie, redirect |
| POST | `/guest/tabs/join` | — | Body `{ venuePublicId, pin }` → cookie |
| GET | `/guest/tab` | Cookie guest | Tab atual, itens, total |
| POST | `/guest/orders` | Cookie guest | Header `Idempotency-Key` |
| GET | `/guest/orders/{id}` | Cookie guest | Status |

### POST /guest/orders (body)

```json
{
  "items": [
    { "catalogItemId": "uuid", "qty": 2, "note": "sem gelo" }
  ]
}
```

Preço **não** enviado pelo cliente.

## Staff

Auth: `Authorization: Bearer {staffJwt}` ou cookie `eaimesa_staff`.

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| POST | `/staff/auth/login` | — | E-mail/senha |
| GET | `/staff/orders` | staff | Fila (?status=pending) |
| PATCH | `/staff/orders/{id}` | staff | `{ status: "accepted" }` |
| POST | `/staff/tables/{tableId}/claims` | staff | Gera claim → `{ claimUrl, expiresAt }` |
| POST | `/staff/tabs/{tabId}/lock` | staff | Trava tab |
| POST | `/staff/tabs/{tabId}/close` | owner/staff | Fecha conta |

## Owner

| Método | Path | Descrição |
|--------|------|-----------|
| CRUD | `/owner/catalog/**` | Categorias e itens |
| CRUD | `/owner/tables/**` | Mesas |
| GET | `/owner/venue` | Código público, status assinatura |
| POST | `/owner/staff/invites` | Convite staff |

## Platform (futuro)

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/platform/venues` | Lista tenants |
| POST | `/platform/venues/{id}/suspend` | Suspende |

## Webhooks (futuro)

- `POST /webhooks/asaas` — assinatura B2B (HMAC)

## SSE / WebSocket (staff fila)

- `GET /staff/orders/stream` — eventos `order.created`, `order.updated`

## Códigos de erro (amostra)

| Code | HTTP |
|------|------|
| `VENUE_NOT_FOUND` | 404 |
| `VENUE_SUSPENDED` | 403 |
| `CLAIM_EXPIRED` | 410 |
| `CLAIM_ALREADY_USED` | 409 |
| `PIN_INVALID` | 401 |
| `PIN_LOCKED` | 429 |
| `TAB_CLOSED` | 409 |
| `FORBIDDEN_CROSS_VENUE` | 403 |

OpenAPI completo: gerar em `apps/api/openapi.yaml` quando scaffold existir.
