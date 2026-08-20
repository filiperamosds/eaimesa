# Fatia 3 — Mesas

O salão vira entidade. O dono cadastra as mesas do bar (até 15 no plano Bar). Pedido de balcão **escolhe uma mesa**, em vez de digitar o rótulo livre. **Ainda sem claim, PIN ou pedido pelo cliente no `/{slug}`.**

## Inclui

- CRUD de mesas em `/painel/mesas` — aba no painel: Pedidos | Cardápio | **Mesas** | Meu bar
- API `GET/POST /v1/owner/tables` e `PATCH/DELETE /v1/owner/tables/{id}`
- Limite de **15 mesas ativas** por venue (plano Bar)
- Pedido de balcão: grade de mesas ativas; `table_label` continua snapshot no pedido
- Seed: Balcão + Mesa 1–10 no Bar do Tião
- **QR fixo da mesa** (painel): aponta para o cardápio público `/{slug}`; exportável (PNG). Pode colar na mesa.

O cardápio público `/{slug}` **não muda de contrato** — só leitura, sem pedir.

## Não inclui

- Claim do garçom / QR de comanda (fatia seguinte)
- PIN, cookie guest, pedido pelo slug
- Mapa do salão arrastável / plantas
- Staff separado do dono

## Dois QRs (regra permanente)

| QR | Onde | Destino | Autoriza pedir? |
|----|------|---------|-----------------|
| **Fixo da mesa** | Adesivo / export do painel | `/{slug}` (cardápio do bar) | **Não** — só leitura |
| **Garçom (claim)** | Gerado na hora no painel | `/{slug}/c/{token}` | **Sim** — abre comanda (TTL, uso único) |

O modo comanda **só** abre ao escanear o QR do garçom. O QR fixo na mesa nunca abre pedido, mesmo que alguém tire foto ou mande no WhatsApp.

Ver [ADR-002](../decisions/ADR-002-claim-garcom.md) e [sessão claim + PIN](../architecture/sessao-claim-pin.md).

## Por que mesas agora

O Kanban (fatia 2) usa texto livre (`Mesa 4`). Isso não escala para claim: o QR do garçom precisa de `table_id`. Cadastrar o salão + QR fixo do cardápio é o passo entre “fila no painel” e “cliente pede na mesa”.

Ver [ADR-006](../decisions/ADR-006-mesas.md).

## Card da mesa

- Rótulo (`Mesa 4`, `Balcão`, `Varanda`)
- Ativa / oculta (oculta some do pedido de balcão; pedidos antigos mantêm o snapshot)
- Ordem de exibição
- QR fixo do cardápio (mesmo `/{slug}` em todas as mesas; o adesivo leva o **rótulo** impresso para o cliente saber onde está)

## Pedido de balcão

Staff toca a mesa e os itens. A API grava `table_id` (quando informado) e **sempre** `table_label` no momento do pedido. Renomear a mesa não reescreve o histórico.

Se o bar ainda não cadastrou mesas, o lançamento aceita rótulo livre (mesmo contrato da fatia 2) e o painel aponta para `/painel/mesas`.

## QR do claim (próxima fatia)

Geração, countdown e export pontual do claim ficam em `/painel/*`. O `/{slug}` público não gera claim.
