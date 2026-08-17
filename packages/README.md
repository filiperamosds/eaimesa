# Packages / apps

Código será adicionado na próxima fase. Estrutura planejada:

```
apps/
  api/     # Fastify REST + SSE
  guest/   # Next.js PWA cliente
  staff/   # Next.js painel garçom/dono

packages/
  db/      # schema Drizzle/Prisma, migrations
  shared/  # zod schemas, types, constants
  config/  # eslint, tsconfig base
```

Ordem de implementação sugerida:

1. `packages/db` + migrations Venue, Table, Tab, TableClaim, GuestSession
2. `apps/api` — redeem claim + join PIN + create order
3. `apps/staff` — gerar claim + fila
4. `apps/guest` — cardápio + carrinho
5. Billing gate + owner CRUD cardápio
