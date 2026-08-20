# ADR-010: Pedido guest só com comanda pessoal

**Status:** Aceito  
**Data:** 2026-08-20

## Contexto

O cardápio por slug não pode autorizar pedir (entrega remota, conta de outra mesa). A fatia 6 já separa presença (mesa) e dívida (pessoa). Falta o carrinho.

## Decisão

- Pedido guest exige cookie `eaimesa_guest` **e** tab `open`
- Preço e nome vêm do catálogo no servidor
- `source = guest` + `tab_id` + snapshot da mesa
- `Idempotency-Key` (UUID) evita duplo envio na rede ruim do bar

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Pedir só com o slug | Pedido remoto; quebra o modelo claim/PIN |
| Cliente envia `priceCents` | Adulteração |
| Sem idempotência | Dedo nervoso / retry cria dois pedidos |

## Consequências

- `/{slug}` ganha carrinho só depois da comanda pessoal
- Cliente vê a própria parcial (`GET /v1/guest/orders`, `/{slug}/comanda`)
- Kanban mistura balcão e cardápio; o card mostra o nome da pessoa
- Venue suspenso não cria pedido (`VENUE_SUSPENDED`)
