# Sessão: claim do garçom + PIN + cookie

Núcleo de confiança do produto. Três peças **separadas**.

## 1. Código da casa (`slug`)

- Ex.: `bar-do-tiao` (configurável). `public_id` opaco existe no banco mas **não** é a URL do cardápio.
- Público (Instagram, QR **fixo na mesa**, QR na porta).
- `GET /v1/public/venues/{slug}` → cardápio (somente leitura se sem sessão).
- **Nunca** autoriza `POST /guest/orders`.
- QR fixo da mesa = URL `/{slug}` (mesmo cardápio em todas as mesas). Gerado e exportado no painel; adesivo pode mostrar o rótulo da mesa ao lado do código.

## 2. Claim (TableClaim)

Gerado pelo staff autenticado para uma mesa. **Este** é o QR que abre a comanda.

| Campo | Regra |
|-------|--------|
| `token` | 32+ bytes aleatórios, URL-safe |
| Armazenamento | **Só hash** (argon2/bcrypt) |
| TTL | 120–300 s (config `CLAIM_TTL_SECONDS`) |
| Uso | **Single redeem** — primeiro scan consome |
| Escopo | `venue_id` + `table_id` + `staff_user_id` |
| Invalidação | Novo claim na mesma mesa invalida anterior não usado |
| URL | `/{slug}/c/{token}` |

### Onde o QR vive (UI)

| Tipo | Onde | Export |
|------|------|--------|
| **Cardápio (fixo)** | `/painel/mesas` e `/painel/bar` | PNG para adesivo / Instagram / porta |
| **Claim (comanda)** | `/painel/*` ao abrir mesa | PNG pontual; TTL + uso único |

O cardápio público e a landing **não** geram claim. Modo comanda **só** após escanear o QR do garçom.

### Redeem

```
POST /v1/public/venues/{slug}/c/{token}/redeem
→ 200 Set-Cookie: eaimesa_guest=...; HttpOnly; Secure; SameSite=Lax
→ 302 Location: /{slug}
→ Body inclui pin_display (4 dígitos) para compartilhar na mesa
```

Após redirect, **token não permanece** na barra de endereço.

## 3. PIN da Tab

- PIN **da mesa** (TableSession), 4 dígitos, ex. `4821`.
- Mostrado no primeiro aparelho.
- `POST /guest/tabs/join` com `{ slug, pin }` → cookie na ocupação da mesa.
- Comanda pessoal: `POST /guest/tabs` `{ name, phone }`.

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
| Primeiro na mesa | Claim → PIN da mesa → nome+telefone (comanda) |
| Outro aparelho / pessoa | PIN join → nome+telefone (retoma se o telefone já existe) |
| Sem PIN, sem claim | Cardápio read-only |

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
