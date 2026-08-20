# Documentação EaiMesa

Índice. Fatia atual: **console SaaS**; fatias 1–10 já estão no repo.

1. [Fatia 1 — Cardápio](product/fatia-01-cardapio.md)
1b. [Fatia 2 — Pedidos](product/fatia-02-pedidos.md) — Kanban / KDS no painel
1c. [Fatia 3 — Mesas](product/fatia-03-mesas.md) — salão cadastrado, pedido escolhe mesa
1d. [Fatia 4 — Claim garçom](product/fatia-04-claim-garcom.md) — equipe, `/garcom`, redeem + PIN
1e. [Fatia 5 — PIN join](product/fatia-05-pin-join.md) — outro celular entra na mesa
1f. [Fatia 6 — Comandas individuais](product/fatia-06-comandas-individuais.md) — nome + telefone, várias contas por mesa
1g. [Fatia 7 — Pedido guest](product/fatia-07-pedido-guest.md) — carrinho no `/{slug}` na comanda pessoal
1h. [Fatia 8 — Fila do garçom](product/fatia-08-fila-garcom.md) — Kanban em `/garcom/pedidos`
1i. [Fatia 9 — Parcial do cliente](product/fatia-09-parcial-guest.md) — comanda no celular: itens, status, total
1j. [Fatia 10 — Planos](product/fatia-10-planos.md) — Cardápio vs Auto atendimento, trial, checkout stub
1k. [Fatia 11 — Console SaaS](product/fatia-11-console-saas.md) — login da plataforma, dashboard, bares, catálogo (criar plano + promo)
2. [Visão do produto](product/visao.md) — o quê, para quem, o que fica de fora
3. [Fluxos](product/fluxos.md) — publicar cardápio; guest pede na mesa
4. [Pricing](product/pricing.md) — Cardápio e Auto atendimento
5. [Arquitetura](architecture/overview.md) — dois repos (API + Next), um front, Fastify
6. [Sessão claim + PIN](architecture/sessao-claim-pin.md) — claim, PIN join, cookie guest
7. [Segurança](security/modelo.md) — tenancy, cookies, ameaças
8. [Modelo de dados](data/schema.md) — entidades fatia 1–11 + planejadas
9. [API](api/endpoints.md) — REST fatia 1–11 + contrato futuro
10. [Dev setup](ops/dev-setup.md) — pnpm, Postgres, seed `bar-do-tiao`, `cafe-da-lina` e console
11. [ADRs](decisions/ADR-001-stack.md) — stack, claim, front único, slug, Kanban, mesas, comandas, pedido guest, fila garçom, planos, console SaaS, SKU + promo, **dois repositórios**

## Cursor

Regra sempre ativa: `.cursor/rules/docs-sync.mdc` — mudança de produto/API/dados **atualiza estes specs na mesma alteração**.

Canvases `.canvas.tsx` do IDE **não** fazem parte deste repositório. O conteúdo relevante está em `docs/product/` e `docs/architecture/`.
