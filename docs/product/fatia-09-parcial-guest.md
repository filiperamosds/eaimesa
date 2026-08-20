# Fatia 9 — Parcial do cliente

O garçom já vê a parcial por comanda. Quem pediu no celular também precisa ver **os próprios** itens, o status e o total — sem pagamento.

## Inclui

- Faixa do cardápio: nome · mesa · total · link **Parcial**
- `/{slug}/comanda` com a comanda aberta mostra a parcial (não só o formulário de nome)
- Cesta no `/{slug}`: seção **Já na comanda** + total
- `GET /v1/guest/orders` devolve `{ orders, totalCents }` (cancelados no histórico; **fora** do total)
- Poll curto (~5s) para o status acompanhar a fila
- Só a comanda da pessoa (não a da mesa inteira)

## Não inclui

- Pagamento / split / pedir a conta (`lock`)
- Ver pedidos de outras pessoas na mesa
- SSE

## Fluxo

1. Cliente pede pelo cardápio.
2. Abre **Parcial** na faixa, na cesta ou em `/{slug}/comanda`.
3. Vê fila → aceito → preparando → entregue, e o total.
4. Para fechar, chama o garçom (como hoje).

`GET` da parcial não exige o bar estar aceitando pedido novo (`accepts_orders`). `POST` continua exigindo.

Ver [fatia 7](fatia-07-pedido-guest.md) (carrinho) e [fatia 6](fatia-06-comandas-individuais.md) (parcial do garçom).
