# Pricing

Mensalidade fixa; **sem comissão** sobre consumo. Trial e vigência (default **7** e **30** dias) vêm de `platform_settings`. Preço e copy da vitrine vêm de `plan_catalog` (editáveis em `/admin/planos`). O operador pode **criar SKUs** novos: cada um tem `kind` (`cardapio` | `auto_atendimento`) e, opcionalmente, `promo_price_cents`. Se a promo estiver preenchida e for menor que o preço cheio, landing, cadastro e checkout mostram **de R$ X por R$ Y** e a cobrança stub usa o valor da promo.

Nesta fatia o checkout é **stub**: o front mostra cartão/PIX e o valor; a API espera ~2s e devolve sucesso, sem gateway.

## Planos vendáveis

O catálogo não está mais limitado a dois ids. Os seed:

| | **Cardápio** (`kind=cardapio`) | **Auto atendimento** (`kind=auto_atendimento`) |
|--|--------------|----------------------|
| Mensal (cheio) | **R$ 49/mês** | **R$ 149/mês** |
| Promo | opcional (`promo_price_cents`) | opcional |
| Cardápio público + QR | Sim | Sim |
| Pedido no celular / comanda / Kanban | Não | Sim |
| Mesas | — | Até **15** |
| Staff | — | Até **5** |
| Pedidos | — | Ilimitados |
| Térmica | Não | Não |

SKUs extras no `/admin/planos` herdam o que o `kind` libera. Máximo **12** planos. Sem DELETE: unlist esconde da vitrine.

Vigência paga no stub: **30 dias** a partir do checkout.

## Em breve (não vender agora)

**Equipamento na mesa** — tablet/hardware no salão. Sem preço e sem CTA de compra.

## Troca de plano

- **Subir** (`kind` Cardápio → Auto atendimento): a qualquer momento, via checkout.
- **Trocar** SKUs do mesmo `kind`: a qualquer momento.
- **Descer** (Auto atendimento → Cardápio): só depois do fim da vigência **paga**. No trial, pode trocar.

## Early adopters / anual

Fora desta fatia (o “Plano Bar” único e o desconto de R$ 119 saem).

## Setup

- **R$ 0** self-serve no trial.
- **R$ 150** opcional: cadastro assistido do cardápio (comercial; não está no app).

## O que não cobrar

- Percentual sobre consumo
- Taxa por pedido
- Gateway nesta fatia (checkout devolve sucesso após ~2s; UI de cartão/PIX não processa)

## Referência de mercado (2026)

- Cardápio QR básico: ~R$ 20–100/mês
- Comanda self-service: ~R$ 150–199/mês

EaiMesa: **Cardápio** na faixa QR; **Auto atendimento** na faixa de comanda confiável.
