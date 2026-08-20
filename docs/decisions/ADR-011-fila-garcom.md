# ADR-011: Fila do garçom em `/garcom/pedidos`

**Status:** Aceito  
**Data:** 2026-08-20

## Contexto

A fatia 7 manda o pedido do cliente para o Kanban do **dono**. No salão, quem opera a fila é o garçom no celular. `/painel` bloqueia `role: staff`.

## Decisão

- Mesmo board Kanban, rota **`/garcom/pedidos`**
- API `GET/PATCH/POST /v1/staff/orders` com `requireVenueActor` (dono ou garçom)
- Nav no app garçom: **Mesas | Pedidos**
- Sem SSE nesta fatia (poll)

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Liberar `/painel/pedidos` para staff | Painel mistura cardápio/equipe; o celular do salão é `/garcom` |
| Fila só no dialog da mesa | Não mostra o gargalo da cozinha |
| App nativo / SSE agora | Front único; poll já cobre o turno |

## Consequências

- Pedido guest e balcão aparecem para o garçom
- Dono pode abrir `/garcom/pedidos` com a mesma sessão
- `/v1/owner/orders` permanece para o painel
