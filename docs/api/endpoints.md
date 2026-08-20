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

## Implementado (fatias 1–10)

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
  "slug": "bar-do-tiao",
  "plan": "auto_atendimento"
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

Itens inativos e categorias inativas **não** entram na resposta pública. Venue `suspended`: ainda retorna o cardápio com `subscriptionStatus` para o front avisar. `plan` entra no payload (`cardapio` não oferece PIN/pedido).

### Billing (fatia 10)

Checkout **stub**: sem Asaas. Resposta de sucesso para o front.

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/v1/billing/plans` | — | Catálogo dos planos vendáveis + futuro |
| GET | `/v1/billing/me` | Owner | Plano atual, trial/vigência, `canUpgrade` / `canDowngrade` |
| POST | `/v1/billing/checkout` | Owner | `{ plan }` → `status: success`, `active` 30 dias |

Downgrade com vigência paga em aberto → 409 `PLAN_DOWNGRADE_LOCKED`. Recurso de Auto atendimento no plano Cardápio → 403 `PLAN_FEATURE`. Trial/vigência vencidos → 403 `BILLING_INACTIVE`.

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
| GET | `/v1/staff/tables` | Mesas ativas + `sessionOpen`, `claimPending`, `openTabCount`, `openTabs` (nome + telefone mascarado) |
| POST | `/v1/staff/tables/{tableId}/claims` | Gera claim (TTL, uso único). Permitido com mesa ocupada |
| GET | `/v1/staff/tables/{tableId}/tabs` | Comandas da mesa + parcial de pedidos |
| POST | `/v1/staff/tabs/{tabId}/close` | Fecha uma comanda |
| POST | `/v1/staff/tables/{tableId}/close` | Encerra a mesa (409 se ainda houver comanda aberta) |

### Staff — fila (fatia 8)

Auth: cookie `role: owner | staff`. Mesmas regras de status do Kanban do dono.

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/v1/staff/orders` | Fila 48h (`pending`…`delivered`) |
| POST | `/v1/staff/orders` | Pedido de balcão (preço no servidor) |
| PATCH | `/v1/staff/orders/{id}` | `{ status }` |
| GET | `/v1/staff/catalog` | Cardápio (leitura) para o formulário de balcão |

Resposta de `GET /v1/staff/tables` (recorte):

```json
{
  "tables": [
    {
      "id": "uuid",
      "label": "Mesa 4",
      "sortOrder": 4,
      "sessionOpen": true,
      "claimPending": false,
      "openTabCount": 2,
      "openTabs": [
        { "id": "uuid", "guestName": "Maria", "guestPhoneMasked": "•••• 7777" },
        { "id": "uuid", "guestName": "João", "guestPhoneMasked": "•••• 6666" }
      ]
    }
  ]
}
```

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
| POST | `/v1/public/venues/{slug}/c/{token}/redeem` | — | Abre/reusa TableSession, PIN (só na 1ª), Set-Cookie guest |

Resposta:

```json
{
  "pinDisplay": "4821",
  "tableLabel": "Mesa 4",
  "slug": "bar-do-tiao",
  "needsProfile": true,
  "redirectPath": "/bar-do-tiao/bem-vindo"
}
```

`pinDisplay` é `null` se a mesa já tinha PIN (segundo QR). Front: `/{slug}/c/{token}` → bem-vindo ou `/comanda`.

### Guest — PIN join (fatia 5) e comanda pessoal (fatia 6)

Cookie guest: `eaimesa_guest`. Join não exige cookie. Abrir comanda exige cookie da mesa.

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/v1/guest/tabs/join` | — | `{ slug, pin }` → sessão na mesa |
| POST | `/v1/guest/tabs` | Cookie guest | `{ name, phone }` → cria ou retoma comanda |
| GET | `/v1/guest/tab` | Cookie guest | Mesa + comanda (`needsProfile` se ainda sem nome) |

#### POST /v1/guest/tabs/join (body)

```json
{ "slug": "bar-do-tiao", "pin": "4821" }
```

PIN casa com **TableSession** `open`. Resposta: `tableLabel`, `slug`, `needsProfile`, `redirectPath` (`/{slug}/comanda`).

#### POST /v1/guest/tabs (body)

```json
{ "name": "Maria", "phone": "11988887777" }
```

Telefone: 10–13 dígitos. Mesmo telefone na sessão retoma a comanda. Resposta inclui `guestName`, `tableLabel`, `redirectPath`.

### Guest — pedidos (fatia 7)

Cookie `eaimesa_guest` com **tab** `open`. Preço **não** vai no body.

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/v1/guest/orders` | Cookie guest | Carrinho → pedido `pending`, `source=guest` |
| GET | `/v1/guest/orders` | Cookie guest | Pedidos da comanda (48h) + `totalCents` (sem cancelados) |
| GET | `/v1/guest/orders/{id}` | Cookie guest | Um pedido da comanda |

Header obrigatório no POST: `Idempotency-Key` (UUID). Mesma chave no venue devolve o mesmo pedido.

`GET /v1/guest/orders` (recorte):

```json
{
  "totalCents": 3890,
  "orders": [
    {
      "id": "uuid",
      "status": "pending",
      "source": "guest",
      "tableLabel": "Mesa 4",
      "guestName": "Maria",
      "totalCents": 3890,
      "items": [{ "name": "Pão de alho", "qty": 1, "unitPriceCents": 1290 }]
    }
  ]
}
```

Só a comanda do cookie. Cancelados aparecem na lista e **não** somam em `totalCents`.

#### POST /v1/guest/orders (body)

```json
{
  "note": "sem gelo",
  "items": [
    { "catalogItemId": "uuid", "qty": 2, "note": "mal passado" }
  ]
}
```

Erros: `PIN_INVALID`, `PIN_LOCKED`, `TAB_CLOSED`, `TAB_REQUIRED`, `TABS_STILL_OPEN`, `SESSION_REQUIRED`, `VENUE_SUSPENDED`, `ITEM_NOT_FOUND`.

#### PATCH /v1/owner/orders/{id}

```json
{ "status": "accepted" }
```

Valores: `pending` | `accepted` | `preparing` | `delivered` | `cancelled`.

## Planejado (fatias seguintes)

Não implementar agora. Mantido para não perder o contrato do MVP.

### Guest / pedidos

Implementado na fatia 7 (`POST/GET /v1/guest/orders`).

### Staff (além do claim)

Implementado na fatia 8 (`GET/PATCH/POST /v1/staff/orders`). `lock` e SSE continuam fora.

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

- `POST /v1/webhooks/asaas` — assinatura B2B (HMAC). Checkout da fatia 10 é stub.

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
| `TAB_REQUIRED` | 403 |
| `VENUE_SUSPENDED` | 403 |
| `PLAN_FEATURE` | 403 |
| `PLAN_DOWNGRADE_LOCKED` | 409 |
| `BILLING_INACTIVE` | 403 |
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
| `TABS_STILL_OPEN` | 409 |
| `SESSION_REQUIRED` | 401 |
| `FORBIDDEN_CROSS_VENUE` | 403 |

OpenAPI: gerar em `apps/api/openapi.yaml` quando o contrato da fatia 1 estabilizar.
