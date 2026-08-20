# Fatia 4 — Claim do garçom + equipe

O garçom abre a comanda na mesa. O dono cadastra usuários de **garçom** no painel. No celular, o garçom escolhe a mesa e gera o **QR de claim** (TTL, uso único). O cliente escaneia → tab + PIN + cookie guest. **Ainda sem pedido pelo cardápio** (fatia 6).

## Inclui

- CRUD de garçons em `/painel/equipe` (dono) — cria `account` + `venue_member`
- **Login único** em `/login` — cookie `eaimesa_owner` com `role: owner | staff`
- App garçom em `/garcom` — grade de mesas, gera QR de comanda no celular
- API `POST /v1/staff/tables/{id}/claims` (staff ou dono)
- Redeem `POST /v1/public/venues/{slug}/c/{token}/redeem` → tab + PIN + cookie `eaimesa_guest`
- Página `/{slug}/c/{token}` no front (redeem) e `/{slug}/bem-vindo` (PIN grande)
- Limite: **5 garçons ativos** por venue (plano Bar)
- Seed: `garcom@bardotiao.local` / senha demo

## Dois QRs (recapitulando)

| QR | Quem gera | Destino | Abre comanda? |
|----|-----------|---------|---------------|
| Fixo da mesa | Dono (export) | `/{slug}` | Não |
| Garçom (claim) | Garçom ou dono no painel | `/{slug}/c/{token}` | Sim |

## Não inclui

- Pedido guest pelo cardápio (`POST /guest/orders`) — fatia 6
- PIN join em outro aparelho (`POST /guest/tabs/join`) — [fatia 5](fatia-05-pin-join.md)
- Fechar / travar tab
- Impressora, SSE

Ver [ADR-002](../decisions/ADR-002-claim-garcom.md), [ADR-007](../decisions/ADR-007-staff-garcom.md), [sessão claim + PIN](../architecture/sessao-claim-pin.md).

## Fluxo garçom

1. Dono cadastra garçom (nome, e-mail, senha) em **Equipe**.
2. Garçom entra em **`/login`** (mesmo do painel) → redireciona para `/garcom`.
3. Toca a mesa → QR grande + countdown (ex. 3 min).
4. Cliente escaneia → vê PIN → cardápio com sessão (pedir na fatia 6).

## Fluxo dono

O dono continua com Kanban, cardápio e mesas. Também pode gerar claim (mesma API) enquanto não houver login staff separado no turno.
