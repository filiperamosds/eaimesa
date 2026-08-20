# Fatia 11 — Console SaaS (operador EaiMesa)

Login da **plataforma**, não do dono do bar. O operador vê vendas da assinatura, a lista de estabelecimentos e o catálogo de planos.

## Inclui

- `/admin/login` — e-mail + senha; cookie `eaimesa_platform` (não é o cookie do dono)
- `/admin` — dashboard: bares por status/plano, MRR estimado, checkouts stub (30 dias)
- `/admin/bares` — busca, filtro, suspender / reativar
- `/admin/planos` — criar SKU, nome, tipo (`kind`), preço, **promo opcional**, blurb, features, listado; trial e vigência globais
- `GET /v1/billing/plans` lê o **banco** (landing, cadastro e checkout usam isso). Com promo: `promoPriceCents` + `effectivePriceCents`
- `POST /v1/platform/plans` cria plano (id = slug do nome; `kind` = o que o bar pode fazer)
- Checkout stub cobra o preço **efetivo** (promo se preenchida e menor que o cheio) e grava `billing_events`
- Seed: `ops@eaimesa.local` / `demo1234`

## Não inclui

- Gateway real (Asaas)
- SSO / 2FA
- Impersonate o dono
- Editar cardápio/mesas do bar
- KYC, nota, reembolso
- DELETE de plano (unlist esconde da vitrine)
- Terceiro tipo de produto (equipamento continua “em breve”)
- Dashboard de consumo do salão (pedidos/comandas)

## Superfície

Mesmo `apps/web`. Rotas `/admin/*` (slug `admin` já é reservado).

| Path | Quem |
|------|------|
| `/admin/login` | Operador deslogado |
| `/admin` | Dashboard |
| `/admin/bares` | Tenants |
| `/admin/planos` | Catálogo |

## Fluxo

1. Operador entra em `/admin/login`.
2. Dashboard mostra os bares do seed (trial → MRR 0) e os checkouts stub. Status e plano aparecem em português (Em trial, Ativo, Cardápio…).
3. Dono paga no painel → evento entra em vendas; MRR sobe se `active`.
4. Operador cria um plano ou preenche promo → landing/`/preco`/cadastro/checkout mostram **de R$ X por R$ Y** quando a promo está preenchida.
5. Suspender um bar → `subscription_status=suspended`; cardápio público continua leitura.

Ver [ADR-013](../decisions/ADR-013-console-saas.md) e [ADR-014](../decisions/ADR-014-plan-kind-promo.md).
