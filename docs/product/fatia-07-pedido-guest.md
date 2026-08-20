# Fatia 7 — Pedido pelo cardápio

Quem tem **comanda pessoal aberta** pede pelo `/{slug}`. O preço sai do servidor; o pedido cai no Kanban e na parcial da pessoa. Sem QR/PIN + nome/telefone, o cardápio continua só leitura.

## Inclui

- Carrinho no cardápio público (só com comanda `open`)
- `POST /v1/guest/orders` — cookie guest, `tab_id`, `source = guest`, header `Idempotency-Key`
- `GET /v1/guest/orders` e `GET /v1/guest/orders/{id}` — pedidos daquela comanda
- Snapshot de nome/preço no `OrderItem` (cliente **não** envia preço)
- Kanban `/painel/pedidos` (dono) e `/garcom/pedidos` (garçom)
- Parcial do cliente: [fatia 9](fatia-09-parcial-guest.md)
- Venue `suspended` → 403 `VENUE_SUSPENDED`; seed liga `accepts_orders`

## Não inclui

- Pagamento / split
- SSE (o Kanban já faz poll)
- Pedido sem comanda (slug sozinho continua 401/403)
- Alterar pedido depois de enviado (só cancelar no Kanban)

## Fluxo cliente

1. QR ou PIN → nome + telefone → comanda.
2. No cardápio, adiciona itens (qty, nota opcional do item).
3. Envia o pedido → `pending` na fila.
4. Faixa: nome · mesa · total. Link **Parcial** e `/{slug}/comanda` listam os pedidos da pessoa.

## Regras

- Sem cookie guest → 401.
- Cookie sem tab (ainda sem nome) → 403 `TAB_REQUIRED`.
- Comanda ou mesa encerrada → 409 `TAB_CLOSED`.
- Item inativo / de outro bar → 400 `ITEM_NOT_FOUND`.
- Mesma `Idempotency-Key` no mesmo venue devolve o **mesmo** pedido.
- A chave é UUID v4 gerado no cliente mesmo em HTTP (`.local` / IP da LAN), sem `crypto.randomUUID`.

Ver [ADR-010](../decisions/ADR-010-pedido-guest.md).
