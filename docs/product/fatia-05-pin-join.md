# Fatia 5 — PIN join (outros aparelhos)

O grupo entra na mesma comanda sem o garçom voltar. Quem já tem o PIN (visto no primeiro celular após o claim) abre o cardápio `/{slug}`, informa os 4 dígitos e ganha cookie guest. **Ainda sem pedido pelo cardápio** (fatia 6).

## Inclui

- API `POST /v1/guest/tabs/join` — body `{ slug, pin }` → nova `GuestSession` na tab **open** + cookie `eaimesa_guest`
- API `GET /v1/guest/tab` — sessão atual (mesa, slug) para o cardápio mostrar que o aparelho já entrou
- Página `/{slug}/entrar` — PIN de 4 dígitos
- Cardápio `/{slug}`: atalho “Já tenho o PIN” e faixa “Você está na Mesa X” se houver sessão
- Rate limit: **5 falhas / 15 min / IP + venue** (o body não traz `tabId`; o PIN resolve a mesa)
- Seed inalterado (PIN nasce no redeem, não no seed)

O QR fixo da mesa continua **só cardápio**. Quem chega por `/{slug}` sem PIN continua em leitura.

## Não inclui

- Pedido guest (`POST /guest/orders`) — fatia 6
- Fechar / travar tab
- Carrinho, SSE, impressora

## Fluxo

1. Primeiro aparelho: claim → PIN grande em `/{slug}/bem-vindo`.
2. Outro celular: abre `/{slug}` (QR fixo) ou `/{slug}/entrar`.
3. Informa o PIN → cookie guest na **mesma** tab.
4. Garçom **não** gera outro QR.

PIN errado → `PIN_INVALID` (401). Tab fechada/travada não casa (parece PIN inválido). Muitas falhas → `PIN_LOCKED` (429).

Ver [sessão claim + PIN](../architecture/sessao-claim-pin.md) e [ADR-002](../decisions/ADR-002-claim-garcom.md).
