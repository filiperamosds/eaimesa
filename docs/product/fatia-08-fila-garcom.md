# Fatia 8 — Fila do garçom

O dono já tem o Kanban em `/painel/pedidos`. O **garçom** precisa da mesma fila no celular: aceitar, preparar, entregar — sem entrar no painel do dono.

## Inclui

- App `/garcom/pedidos` — Kanban (Mesas | Pedidos)
- `GET /v1/staff/orders` — fila 48h (dono ou garçom)
- `PATCH /v1/staff/orders/{id}` — `{ status }`
- `POST /v1/staff/orders` — pedido de balcão pelo celular
- `GET /v1/staff/catalog` — cardápio (leitura) para lançar balcão
- Poll curto (já existe no board). Sem SSE.

## Não inclui

- SSE / som
- Impressora
- Travamento da comanda (`lock`)
- Pagamento

## Fluxo

1. Login garçom → `/garcom` (mesas) ou **Pedidos**.
2. Pedido do cardápio cai em **Novos** (`pending`).
3. Garçom Aceitar → Preparar → Entregar.
4. Pode lançar pedido de balcão na mesma tela.

O Kanban do dono (`/v1/owner/orders`) continua. A regra de status é a mesma.

Ver [ADR-011](../decisions/ADR-011-fila-garcom.md).
