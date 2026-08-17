# Sessão: claim do garçom + PIN + cookie

Núcleo de confiança do produto. Três peças **separadas**.

## 1. Código da casa (`venue_public_id`)

- Ex.: `d1de031d33`
- Estável, público, pode ir no Instagram.
- `GET /v/{venuePublicId}` → cardápio (somente leitura se sem sessão).
- **Nunca** autoriza `POST /guest/orders`.

## 2. Claim (TableClaim)

Gerado pelo staff autenticado para uma mesa.

| Campo | Regra |
|-------|--------|
| `token` | 32+ bytes aleatórios, URL-safe |
| Armazenamento | **Só hash** (argon2/bcrypt) |
| TTL | 120–300 s (config `CLAIM_TTL_SECONDS`) |
| Uso | **Single redeem** — primeiro scan consome |
| Escopo | `venue_id` + `table_id` + `staff_user_id` |
| Invalidação | Novo claim na mesma mesa invalida anterior não usado |
| URL | `/{venuePublicId}/c/{token}` |

### Redeem

```
POST /v/{venuePublicId}/c/{token}/redeem
→ 200 Set-Cookie: eaimesa_guest=...; HttpOnly; Secure; SameSite=Lax
→ 302 Location: /{venuePublicId}
→ Body inclui pin_display (4 dígitos) para compartilhar na mesa
```

Após redirect, **token não permanece** na barra de endereço.

## 3. PIN da Tab

- Gerado ao abrir tab (4 dígitos, ex. `4821`).
- Mostrado grande no primeiro aparelho.
- `POST /guest/tabs/join` com `{ pin }` → cookie para outro device.
- Rate limit: 5 tentativas / 15 min / IP+tab.
- PIN **não** imprime no cardápio da porta.

## 4. GuestSession (cookie)

| Propriedade | Valor |
|-------------|--------|
| Nome | `eaimesa_guest` |
| Conteúdo | ID assinado (session id), não JWT com claims editáveis |
| TTL | 4h sliding ou até fechar tab |
| Revogação | Fechar tab revoga todas as sessões da tab |

Servidor resolve session → `tab_id`, `venue_id`, `device_id`.

## 5. Primeiro vs segundo aparelho

| Cenário | Fluxo |
|---------|--------|
| Primeiro na mesa | Claim redeem → tab criada → PIN exibido |
| Tab já aberta | PIN join → mesma tab |
| Sem PIN, sem claim | Cardápio read-only ou 403 em pedido |

## O que o claim substitui

- CPF do consumidor
- “Confirmar primeiro pedido no bar” (opcional no MVP se claim existir)
- QR fixo na mesa que autoriza pedir

## Ataques e resposta

| Ataque | Resposta |
|--------|----------|
| Foto do código da casa | Só cardápio |
| Foto do claim | TTL + uso único |
| Reenviar claim no WhatsApp | Primeiro scan ganha; segundo usa PIN |
| Garçom manda claim para amigo | Copo na mesa vazia; dono audita |
| Enumerar claims | Token longo + rate limit |

Ver também [modelo de segurança](../security/modelo.md).
