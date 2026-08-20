# Documentação desta API

Cópia das specs do monorepo EaiMesa. Fonte de verdade do produto continua em `filiperamosds/eaimesa/docs/` até a migração Fastify→Laravel fechar.

| Arquivo | Conteúdo |
|---------|----------|
| [api/endpoints.md](api/endpoints.md) | Contrato HTTP `/v1` (inalterado) |
| [data/schema.md](data/schema.md) | Entidades; índices parciais viram colunas geradas no MySQL |
| [security/modelo.md](security/modelo.md) | Cookies, tenancy, ameaças |

Local Laravel: `GET /health` e `http://localhost:8000/v1` (o spec ainda cita `:4000` do Fastify).
