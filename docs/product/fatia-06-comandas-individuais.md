# Fatia 6 — Comandas individuais

Cada pessoa na mesa tem **a sua** comanda. O QR/PIN continua provando presença na mesa; nome + telefone abrem a conta da pessoa. O garçom vê a parcial por comanda e só encerra a mesa quando **todas** estão fechadas.

Pedido pelo cardápio (carrinho) está na [fatia 7](fatia-07-pedido-guest.md).

## Inclui

- **TableSession** — ocupação da mesa + PIN único do grupo
- **Tab** = comanda pessoal: `guest_name`, `guest_phone`, ligada à sessão da mesa
- Várias comandas `open` na mesma mesa
- Guest: após claim ou PIN, formulário nome + telefone (`/{slug}/comanda`) — máscara `(11) 98888-7777`; a API grava só dígitos
- Mesmo telefone na mesma sessão retoma a comanda (outro aparelho)
- Garçom `/garcom`: o salão mostra os **nomes** nas mesas ocupadas e atualiza sozinho; toque abre **dialog** com as contas e a parcial
- Guest `/{slug}/comanda` e a cesta: a **própria** parcial ([fatia 9](fatia-09-parcial-guest.md))
- `POST /v1/staff/tabs/{id}/close` — fecha uma comanda
- `POST /v1/staff/tables/{id}/close` — encerra a mesa; **409** se ainda houver comanda aberta
- Telefone mascarado no painel do garçom (últimos 4 dígitos)

## Não inclui

- Pagamento / split
- Travamento (`locked`) além do close

## Fluxo cliente

1. Garçom gera QR (mesa livre) ou a mesa já tem PIN.
2. Primeiro aparelho: redeem → PIN da **mesa** + nome e telefone → comanda pessoal.
3. Outros: PIN em `/{slug}/entrar` → nome e telefone (mesmo telefone = mesma comanda).
4. Garçom **não** precisa de um QR por pessoa; PIN serve o grupo.

## Fluxo garçom

1. Mesa livre: toque gera QR. Cartão fica “QR ativo” até o primeiro redeem.
2. Quando há comandas, o cartão lista os **nomes** (Maria · João). O quadro recarrega a cada poucos segundos.
3. Toque numa mesa ocupada consulta o estado atual (não reusa o snapshot antigo) e abre as contas.
4. Seleciona uma → itens/pedidos daquela conta.
5. Fecha comanda por pessoa. **Encerrar mesa** só com zero comandas abertas.

## Por que não uma comanda só

Conta única mistura pedidos do grupo e impede fechar “a parte do João”. Presença (claim/PIN) é da mesa; dívida é da pessoa.

Ver [ADR-009](../decisions/ADR-009-comandas-individuais.md).
