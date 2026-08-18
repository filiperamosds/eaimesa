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

1. **Fatia 1 (atual):** db Venue/Account/Catalog → API auth + CRUD + GET público → web landing/auth/painel/`/{slug}`
2. Mesas + claim + PIN + cookie guest (rotas no mesmo `apps/web`)
3. Pedido + fila staff no painel
4. Billing gate

Ver [fatia 1](../docs/product/fatia-01-cardapio.md) e [ADR-003](../docs/decisions/ADR-003-frontend-unico.md).
