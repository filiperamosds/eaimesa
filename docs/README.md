# Documentação EaiMesa

Índice da especificação. Leia nesta ordem para implementar o MVP.

1. [Visão do produto](product/visao.md) — o quê, para quem, o que fica de fora
2. [Fluxos](product/fluxos.md) — guest, garçom, dono, plataforma
3. [Pricing](product/pricing.md) — plano Bar, faixa de preço
4. [Arquitetura](architecture/overview.md) — monorepo, serviços, stack
5. [Sessão claim + PIN](architecture/sessao-claim-pin.md) — núcleo de segurança
6. [Segurança](security/modelo.md) — tenancy, ameaças, controles
7. [Modelo de dados](data/schema.md) — entidades e estados
8. [API](api/endpoints.md) — REST esboço, auth, erros
9. [Dev setup](ops/dev-setup.md) — como rodar quando houver código
10. [ADRs](decisions/ADR-001-stack.md) — decisões fixas

## Canvas do Cursor

Durante o brainstorm foram criados canvases interativos no Cursor IDE (pastas `.cursor/projects/.../canvases/`). **Eles não fazem parte deste repositório.**

- **No celular:** use GitHub/GitLab para ler estes `.md`, ou exporte PDF do README.
- **No Cursor:** abra o arquivo `.canvas.tsx` ao lado do chat (só no desktop Cursor).

O conteúdo relevante dos canvases foi migrado para `docs/product/` e `docs/architecture/`.
