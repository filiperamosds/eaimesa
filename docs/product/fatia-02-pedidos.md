# Fatia 2 — Pedidos (Kanban / KDS)

Fila do bar na tela. O dono (depois o garçom) vê os pedidos em colunas de status. **Ainda sem claim, PIN ou pedido pelo cliente no `/{slug}`.**

## Inclui

- Board Kanban em `/painel/pedidos` — **entrada padrão do painel** após o login (`/painel` redireciona para cá)
- Abas visíveis no topo: Pedidos | Cardápio | Mesas | Meu bar
- Pedido de **balcão** (mesa/rótulo + itens do cardápio; preço snapshot no servidor)
- Mudança de status: `pending` → `accepted` → `preparing` → `delivered` (e `cancelled`)
- API `GET/POST /v1/owner/orders` e `PATCH /v1/owner/orders/{id}`
- Seed com pedidos demo no Bar do Tião

O cardápio público `/{slug}` **não** tem pedidos — só o painel autenticado.

## Não inclui

- Pedido pelo QR / slug público (continua read-only)
- Claim do garçom, PIN, cookie guest
- Mesas como entidade (fatia 3)
- SSE / som de novo pedido (poll curto no board)
- Impressora térmica

## Por que Kanban

Uma lista única esconde o gargalo. Colunas = estados da cozinha/bar: o time vê o que acabou de chegar, o que está no fogo e o que já saiu. No celular o board rola na horizontal.

Ver [ADR-005](../decisions/ADR-005-kanban-pedidos.md).

## Colunas

| Coluna | Status | Ação típica |
|--------|--------|-------------|
| Novos | `pending` | Aceitar |
| Aceitos | `accepted` | Mandar preparar |
| Preparando | `preparing` | Marcar entregue |
| Entregues | `delivered` | Arquivo do turno |

Cancelados saem do board (`cancelled`).

## Card

- Rótulo da mesa (`Mesa 4`, `Balcão`)
- Tempo desde a criação
- Itens (qty × nome) e total
- Nota do pedido, se houver

Toque no card expande os itens. Botões avançam o status (mais confiável no celular que arrastar).

## Pedido de balcão

Enquanto o cliente não pede pelo celular, o staff lança o pedido no board: escolhe itens ativos do catálogo e uma **mesa cadastrada** (fatia 3). `source = counter`. Sem mesas, ainda aceita rótulo livre.
