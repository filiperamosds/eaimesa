# ADR-004: Slug amigável na URL do cardápio

**Status:** Aceito  
**Data:** 2026-08-17

## Contexto

A visão inicial usava `venue_public_id` opaco na URL (`/d1de031d33`). Para o cardápio público isso é ruim de lembrar, de imprimir e de divulgar (Instagram, WhatsApp). O dono precisa de uma URL **configurável**.

## Decisão

- URL pública do cardápio: `/{slug}` (ex. `/bar-do-tiao`)
- `slug` é único, escolhido pelo estabelecimento, kebab-case `[a-z0-9]+(-[a-z0-9]+)*`, 3–48 chars
- `public_id` opaco **permanece** na tabela `venues` como identificador estável (claims/QR futuros podem usá-lo se o slug mudar)
- Sem domínio customizado no MVP (`bar.com.br` próprio continua fora de escopo)

## Alternativas

| Opção | Por que não agora |
|-------|-------------------|
| Só `public_id` opaco | Ruim para marketing do bar |
| Subdomínio `bar-do-tiao.eaimesa.com.br` | TLS/wildcard e cookie mais caros |
| `/c/bar-do-tiao` prefixado | Usuário pediu path na raiz |

## Consequências

- Rotas de produto são slugs reservados (não podem ser nome de bar).
- Troca de slug: URL antiga 404 até existir redirect (não na fatia 1).
- Cardápio em `/{slug}` continua **não autorizando pedido**.
