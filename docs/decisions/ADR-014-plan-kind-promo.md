# ADR-014 — SKU de plano (`id`) separado do tipo (`kind`) + preço promo

## Status

Aceito

## Contexto

O catálogo tinha só dois ids (`cardapio` | `auto_atendimento`) e o CHECK no banco impedia criar SKUs novos. O operador precisa cadastrar mais planos (ex. promoção, faixa intermediária) sem inventar um terceiro **tipo de produto**. Feature gates (pedido, garçom, mesas) dependem do que o bar **pode fazer**, não do slug comercial.

Também precisa de um preço promocional opcional: se preenchido, landing e checkout mostram “de R$ X por R$ Y” e a cobrança stub usa o valor da promo.

## Decisão

- `plan_catalog.id` é o SKU (slug 3–48; letras, números, hífen ou underscore — o seed `auto_atendimento` permanece).
- `plan_catalog.kind` é `cardapio` | `auto_atendimento` — o que o estabelecimento libera.
- `venues.plan` guarda o **id do catálogo**.
- API serializa `planKind` a partir do catálogo; gates usam `planKind` (fallback: id seed).
- `promo_price_cents` nullable. Válido só se `>= 0` e **menor** que `price_cents`. Preço efetivo = promo se válida, senão cheio.
- Sem DELETE nesta fatia: unlist esconde da vitrine. Máximo 12 planos.
- Equipamento na mesa continua “em breve”, sem `kind` novo.

## Consequências

- Vários SKUs do mesmo `kind` (troca lateral no checkout, mesmo rank).
- Downgrade continua bloqueado só quando o `kind` alvo tem rank menor e há vigência **paga** aberta.
- MRR estimado usa o preço **efetivo** do catálogo.
- Landing/cadastro/checkout leem o catálogo (`GET /v1/billing/plans`) e mostram de/por quando há promo.
