# ADR-006: Mesa como entidade (não só rótulo)

**Status:** Aceito  
**Data:** 2026-08-19

## Contexto

Na fatia 2 o pedido de balcão grava `table_label` livre. O MVP precisa de claim por mesa (`table_id` + TTL + uso único). Duas opções: continuar com texto até o claim, ou extrair **Table** agora.

## Decisão

**Mesa é entidade** (`venue_tables`) na fatia 3.

- Pedido guarda `table_id` opcional + `table_label` snapshot (obrigatório).
- Plano Bar: no máximo **15 mesas ativas**.
- UI de pedido escolhe a mesa numa grade; sem digitar se houver mesas.

## Alternativas

| Opção | Por que não agora |
|-------|-------------------|
| Só `table_label` até o claim | Claim teria que “inventar” mesas na hora; slug/QR sem âncora estável |
| Mapa 2D do salão | Escopo de planta; o bar de 10 mesas precisa de lista/grade |
| Mesa só na fatia do claim | Kanban continua inconsistente (Mesa 4 vs Mesa 04); retrabalho na API |

## Consequências

- Aba **Mesas** no painel.
- Pedidos antigos (seed/fatia 2) continuam válidos só com `table_label`.
- Claim (fatia seguinte) referencia `table_id`; o slug público ainda **não** autoriza pedir.
