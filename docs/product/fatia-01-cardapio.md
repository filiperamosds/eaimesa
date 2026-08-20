# Fatia 1 — Cardápio

Primeira entrega cobrável em pedaço: o estabelecimento entra, publica um cardápio, o cliente lê no celular. **Sem pedido, sem garçom, sem comanda.**

## Inclui

- Landing do SaaS (`/`)
- Cadastro e login do **estabelecimento** (`/cadastro`, `/login`)
- Painel do dono: dados do bar + CRUD de categorias e itens (`/painel`)
- Cardápio público gerado pela URL configurada: `https://eaimesa.com.br/{slug}`  
  Exemplo: `/bar-do-tiao`
- API REST correspondente (auth cookie + catálogo + menu público)

## Não inclui (fatias seguintes)

- Claim do garçom, PIN, cookie guest
- Carrinho / pedido pelo cliente (claim). Fila Kanban: ver [fatia 2](fatia-02-pedidos.md).
- Papel staff (garçom) separado do dono
- Billing / gateway
- App nativo, domínio customizado (`cardapio.bar.com`)

O cardápio público é **somente leitura**. Abrir `/{slug}` **não** autoriza pedir (regra permanente, ver [visão](visao.md)).

## UX do cardápio público (`/{slug}`)

- Itens agrupados pelas **categorias** ativas (Petiscos, Porções, …).
- Barra de grupos no topo (âncoras) para pular de seção no celular.
- Lista compacta: **miniatura + nome + preço**. Toque no item abre a **foto maior** e a descrição; toque de novo fecha. Só um item aberto por vez.
- Sem descrição e sem foto: a linha não expande.
- Foto: upload no painel (JPG/PNG/WebP, 2 MB) ou URL `https`. Seed demo usa arquivos em `apps/web/public/seed/`.
- Painel: descrição do item é **textarea** (até 280 caracteres).

## Superfície única

Um único frontend (`apps/web`) concentra marketing, autenticação B2B e cardápio público. Ver [ADR-003](../decisions/ADR-003-frontend-unico.md).

## Slug

- O dono escolhe o slug no cadastro e pode alterar no painel (único no sistema).
- Formato: kebab-case, 3–48 caracteres (`bar-do-tiao`).
- Palavras reservadas (`login`, `painel`, `cadastro`, …) são rejeitadas.
- `public_id` opaco continua no banco (estável se o slug mudar); a URL pública da fatia 1 é o **slug**.
- QR do cardápio (apontando para `/{slug}`) mora no **painel** autenticado e pode ser **exportado** (PNG/PDF) para porta, Instagram, balcão. Não fica gerado em página pública do SaaS.

Ver [ADR-004](../decisions/ADR-004-slug-publico.md).

## Seed local

| Campo | Valor |
|-------|--------|
| Slug | `bar-do-tiao` |
| Nome | Bar do Tião |
| E-mail | `dono@bardotiao.local` |
| Senha | ver `docs/ops/dev-setup.md` (somente local) |
