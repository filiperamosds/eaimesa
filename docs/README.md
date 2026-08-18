# Documentação EaiMesa

Índice. Fatia atual: **pedidos (Kanban)**; o cardápio (fatia 1) já está no repo.

1. [Fatia 1 — Cardápio](product/fatia-01-cardapio.md)
1b. [Fatia 2 — Pedidos](product/fatia-02-pedidos.md) — Kanban / KDS no painel
2. [Visão do produto](product/visao.md) — o quê, para quem, o que fica de fora
3. [Fluxos](product/fluxos.md) — publicar cardápio; depois guest/garçom
4. [Pricing](product/pricing.md) — plano Bar
5. [Arquitetura](architecture/overview.md) — monorepo, um front, Fastify
6. [Sessão claim + PIN](architecture/sessao-claim-pin.md) — núcleo futuro de pedido
7. [Segurança](security/modelo.md) — tenancy, cookies, ameaças
8. [Modelo de dados](data/schema.md) — entidades fatia 1 + planejadas
9. [API](api/endpoints.md) — REST fatia 1 + contrato futuro
10. [Dev setup](ops/dev-setup.md) — pnpm, Postgres, seed `bar-do-tiao`
11. [ADRs](decisions/ADR-001-stack.md) — stack, claim, **front único**, **slug**

## Cursor

Regra sempre ativa: `.cursor/rules/docs-sync.mdc` — mudança de produto/API/dados **atualiza estes specs na mesma alteração**.

Canvases `.canvas.tsx` do IDE **não** fazem parte deste repositório. O conteúdo relevante está em `docs/product/` e `docs/architecture/`.
