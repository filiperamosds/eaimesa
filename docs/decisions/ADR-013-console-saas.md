# ADR-013: Console SaaS no mesmo front, cookie próprio

**Status:** Aceito  
**Data:** 2026-08-20

## Contexto

A fatia 10 vendeu planos e gravou trial/checkout no venue. Falta a superfície da **EaiMesa** (não do bar): ver tenants, suspender, mudar preço, acompanhar o stub de vendas.

O spec de segurança pedia SSO + 2FA. Ainda não há IdP.

## Decisão

- Um único Next (`apps/web`): rotas `/admin/*`.
- Papel `platform` com cookie **`eaimesa_platform`** e JWT próprio (`PLATFORM_JWT_SECRET`). Nunca o mesmo cookie/JWT do dono ou do guest.
- Auth desta fatia: e-mail + senha em `platform_users` (seed local). SSO/2FA depois.
- Catálogo de planos no Postgres (`plan_catalog` + `platform_settings`). `GET /v1/billing/plans` deixa de ser constante só no código.
- Checkouts stub geram `billing_events` para o dashboard.

## Alternativas rejeitadas

| Opção | Por que não |
|-------|-------------|
| Reusar `/login` do dono | Mistura papéis; dono veria todos os bares se o gate falhasse |
| Segundo app Next | Quebra [ADR-003](ADR-003-frontend-unico.md) |
| SSO/2FA já | Sem IdP; o dono também começou com senha |

## Consequências

- Slug `admin` permanece reservado.
- Landing e cadastro precisam ler o catálogo (não só `PLANS` hardcoded).
- Suspender usa `venues.subscription_status = suspended` (já previsto).
