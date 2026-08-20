# Fatia 3 — Mesas

O salão vira entidade. O dono cadastra as mesas do bar (até 15 no plano Bar). Pedido de balcão **escolhe uma mesa**, em vez de digitar o rótulo livre. **Ainda sem claim, PIN ou pedido pelo cliente no `/{slug}`.**

## Inclui

- CRUD de mesas em `/painel/mesas` — aba no painel: Pedidos | Cardápio | **Mesas** | Meu bar
- API `GET/POST /v1/owner/tables` e `PATCH/DELETE /v1/owner/tables/{id}`
- Limite de **15 mesas ativas** por venue (plano Bar)
- Pedido de balcão: grade de mesas ativas; `table_label` continua snapshot no pedido
- Seed: Balcão + Mesa 1–10 no Bar do Tião

O cardápio público `/{slug}` **não muda de contrato** — só leitura, sem pedir.

## Não inclui

- Claim do garçom / QR por mesa
- PIN, cookie guest, pedido pelo slug
- Mapa do salão arrastável / plantas
- Staff separado do dono

## Por que mesas agora

O Kanban (fatia 2) usa texto livre (`Mesa 4`). Isso não escala para claim: o QR precisa de `table_id`. Cadastrar o salão é o passo entre “fila no painel” e “cliente pede na mesa”.

Ver [ADR-006](../decisions/ADR-006-mesas.md).

## Card da mesa

- Rótulo (`Mesa 4`, `Balcão`, `Varanda`)
- Ativa / oculta (oculta some do pedido de balcão; pedidos antigos mantêm o snapshot)
- Ordem de exibição

## Pedido de balcão

Staff toca a mesa e os itens. A API grava `table_id` (quando informado) e **sempre** `table_label` no momento do pedido. Renomear a mesa não reescreve o histórico.

Se o bar ainda não cadastrou mesas, o lançamento aceita rótulo livre (mesmo contrato da fatia 2) e o painel aponta para `/painel/mesas`.

## QR (fatia claim)

Quando o claim entrar: geração, exibição e **exportação** (PNG/PDF) do QR ficam em `/painel/*`. O `/{slug}` público não gera claim. Ver [sessão claim + PIN](../architecture/sessao-claim-pin.md) e [ADR-002](../decisions/ADR-002-claim-garcom.md).
