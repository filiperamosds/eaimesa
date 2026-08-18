# ADR-003: Um único frontend

**Status:** Aceito  
**Data:** 2026-08-17  
**Supersede (parcial):** [ADR-001](ADR-001-stack.md) — quantidade de apps web (não a stack)

## Contexto

O ADR-001 previa `apps/guest` + `apps/staff` (dois Next.js). A fatia 1 é landing + auth do estabelecimento + cardápio público. Dois fronts aumentam custo de design system, auth, CORS e deploy sem ganho agora.

## Decisão

- **Um** app Next.js: `apps/web`
- API permanece **Fastify** em `apps/api` (separada do UI)
- Rotas no mesmo origin:

| Path | Quem | Auth |
|------|------|------|
| `/` | Visitante | — |
| `/cadastro`, `/login` | Dono | — |
| `/painel/*` | Dono | Cookie `eaimesa_owner` |
| `/{slug}` | Cliente / público | — |

Paths estáticos (`/login`, `/painel`, …) têm precedência sobre `/{slug}`.

Staff/garçom e PWA guest entram **no mesmo app**, em rotas futuras (`/painel/fila`, fluxo de mesa), não em novos `apps/*`.

## Alternativas

| Opção | Por que não |
|-------|-------------|
| Dois Next.js | Duplica layout, sessão, CI |
| Tudo na API (templates) | Piora DX e PWA depois |
| Painel em subdomínio `app.` | Extra de CORS/cookie na fatia 1 |

## Consequências

- Cookie do dono e (futuro) cookie guest no mesmo site: **nomes distintos**, nunca o mesmo JWT.
- Lista de slugs reservados precisa incluir todas as rotas de produto.
- Deploy: um front (ex. Vercel) + API + Postgres.
