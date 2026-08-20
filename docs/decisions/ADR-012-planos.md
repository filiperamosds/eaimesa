# ADR-012: Dois planos vendáveis + checkout stub

**Status:** Aceito  
**Data:** 2026-08-20

## Contexto

Um único “Plano Bar” misturava cardápio QR com comanda self-service. Há quem só queira o cardápio. Hardware na mesa é outra oferta, ainda sem produto.

## Decisão

- Planos: `cardapio` e `auto_atendimento` (vendáveis). `equipamento` só no spec.
- Trial de **7 dias** no plano escolhido no cadastro; cobrança depois.
- `POST /v1/billing/checkout` **stub**: sem gateway; espera **2s** e responde `status: success` (vigência 30 dias). Front tem UI de cartão/PIX; **não** envia PAN.
- Landing e `/preco` com **dois cards** (nome, valor, features).
- Upgrade imediato; downgrade só após `current_period_ends_at` (vigência paga). No trial, pode descer.
- Enforcement no servidor (`PLAN_FEATURE`, `BILLING_INACTIVE`). UI esconde o que o plano não tem.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Um plano só, feature flags no painel | Cliente pagaria comanda sem usar |
| Asaas já nesta fatia | Sem conta/credencial; stub destrava o fluxo |
| Downgrade imediato no período pago | Dono pagou Auto atendimento até a data |

## Consequências

- `venues.plan`, `trial_ends_at`, `current_period_ends_at`
- `accepts_orders` acompanha o plano Auto atendimento + assinatura válida
- Seed com um bar em cada plano
