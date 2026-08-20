# ADR-009: Comandas individuais por pessoa

**Status:** Aceito  
**Data:** 2026-08-20

## Contexto

A fatia 4–5 abria **uma** tab por mesa (PIN compartilhado = mesma conta). No salão, cada cliente quer fechar a sua parte. O garçom precisa ver a parcial por pessoa, não um bolo único.

## Decisão

- **TableSession** guarda ocupação da mesa e o PIN do grupo
- **Tab** é comanda pessoal (`guest_name` + `guest_phone`)
- Várias tabs `open` por sessão de mesa
- Encerrar a mesa exige todas as comandas `closed`
- Claim/PIN continuam sendo presença; não misturam as contas

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Uma tab por mesa | Não dá para fechar só um cliente |
| QR/claim por pessoa | Garçom volta em cada um; o PIN do grupo já prova mesa |
| Só nome, sem telefone | Colisão (“dois João”); outro aparelho não retoma a conta |
| CPF | Fricção e LGPD extra (ADR-002) |

## Consequências

- Guest preenche nome + telefone depois do claim/PIN
- Garçom: cartões do salão com nomes; dialog da mesa → lista de contas → parcial
- Telefone é PII: gravar dígitos, mascarar na UI staff, não logar
- Pedido guest (fatia 7) grava `order.tab_id`
