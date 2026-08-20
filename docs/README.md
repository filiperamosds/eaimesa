# Documentação EaiMesa

Índice. Fatia atual: **comandas individuais**; fatias 1–5 já estão no repo.

1. [Fatia 1 — Cardápio](product/fatia-01-cardapio.md)
1b. [Fatia 2 — Pedidos](product/fatia-02-pedidos.md) — Kanban / KDS no painel
1c. [Fatia 3 — Mesas](product/fatia-03-mesas.md) — salão cadastrado, pedido escolhe mesa
1d. [Fatia 4 — Claim garçom](product/fatia-04-claim-garcom.md) — equipe, `/garcom`, redeem + PIN
1e. [Fatia 5 — PIN join](product/fatia-05-pin-join.md) — outro celular entra na mesa
1f. [Fatia 6 — Comandas individuais](product/fatia-06-comandas-individuais.md) — nome + telefone, várias contas por mesa
2. [Visão do produto](product/visao.md) — o quê, para quem, o que fica de fora
3. [Fluxos](product/fluxos.md) — publicar cardápio; depois guest/garçom
4. [Pricing](product/pricing.md) — plano Bar
5. [Arquitetura](architecture/overview.md) — monorepo, um front, Fastify
6. [Sessão claim + PIN](architecture/sessao-claim-pin.md) — claim, PIN join, cookie guest
7. [Segurança](security/modelo.md) — tenancy, cookies, ameaças
8. [Modelo de dados](data/schema.md) — entidades fatia 1–6 + planejadas
9. [API](api/endpoints.md) — REST fatia 1–6 + contrato futuro
10. [Dev setup](ops/dev-setup.md) — pnpm, Postgres, seed `bar-do-tiao`
11. [ADRs](decisions/ADR-001-stack.md) — stack, claim, front único, slug, Kanban, mesas, **comandas**

## Cursor

Regra sempre ativa: `.cursor/rules/docs-sync.mdc` — mudança de produto/API/dados **atualiza estes specs na mesma alteração**.

Canvases `.canvas.tsx` do IDE **não** fazem parte deste repositório. O conteúdo relevante está em `docs/product/` e `docs/architecture/`.
