# Fatia 11 — Console SaaS (operador EaiMesa)

Login da **plataforma**, não do dono do bar. O operador vê vendas da assinatura, a lista de estabelecimentos e o catálogo de planos.

## Inclui

- `/admin/login` — e-mail + senha; cookie `eaimesa_platform` (não é o cookie do dono)
- `/admin` — dashboard: bares por status/plano, MRR estimado, checkouts stub (30 dias)
- `/admin/bares` — busca, filtro, suspender / reativar
- `/admin/planos` — nome, preço, blurb, features, listado na vitrine; trial e vigência globais
- `GET /v1/billing/plans` lê o **banco** (landing, cadastro e checkout usam isso)
- Checkout stub grava `billing_events` (histórico de “vendas”)
- Seed: `ops@eaimesa.local` / `demo1234`

## Não inclui

- Gateway real (Asaas)
- SSO / 2FA
- Impersonate o dono
- Editar cardápio/mesas do bar
- KYC, nota, reembolso
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
2. Dashboard mostra os bares do seed (trial → MRR 0) e os checkouts stub.
3. Dono paga no painel → evento entra em vendas; MRR sobe se `active`.
4. Operador altera o preço do Cardápio → landing/`/preco`/cadastro passam a mostrar o valor novo.
5. Suspender um bar → `subscription_status=suspended`; cardápio público continua leitura.

Ver [ADR-013](../decisions/ADR-013-console-saas.md).
