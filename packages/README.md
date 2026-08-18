# Packages / apps

```
apps/
  api/     # Fastify REST (auth dono, catálogo, menu público)
  web/     # Next.js único — landing, painel, /{slug}

packages/
  db/      # schema Drizzle, migrations SQL, seed
  shared/  # zod, slug, constantes de erro
```

Ordem de implementação:

1. **Fatia 1:** db Venue/Account/Catalog → API auth + CRUD + GET público → web landing/auth/painel/`/{slug}`
2. **Fatia 2 (atual):** Order + Kanban `/painel/pedidos` + pedido de balcão
3. Mesas + claim + PIN + cookie guest + pedido no slug
4. Billing gate

Ver [fatia 1](../docs/product/fatia-01-cardapio.md) e [ADR-003](../docs/decisions/ADR-003-frontend-unico.md).
