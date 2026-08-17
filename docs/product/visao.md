# Visão do produto

## Problema

Bares pequenos usam tablets fixos na mesa (caro, sujo, gargalo) ou garçom anotando no papel (erro, fila). Cardápio QR “solto” permite pedido remoto se o link autorizar pedir.

## Proposta EaiMesa

Plataforma **SaaS multi-tenant**: cada estabelecimento paga aluguel mensal; o consumidor **não paga** a plataforma e **não instala app**.

| Peça | Função |
|------|--------|
| **Código da casa** (`/d1de031d33`) | Identifica o bar. Cardápio público. **Não autoriza pedir.** |
| **Claim do garçom** (`/d1de031d33/c/{token}`) | Secret de uso único, TTL curto. Abre a comanda na mesa. |
| **PIN da tab** | Grupo entra no mesmo celular / outros aparelhos. |
| **Cookie guest** | Sessão httpOnly após redeem do claim. |

## Superfícies

| Superfície | Usuário | MVP |
|------------|---------|-----|
| **Guest PWA** | Cliente na mesa | Cardápio, carrinho, comanda, PIN |
| **Staff** | Garçom / bar | Gerar claim, fila, travar mesa, fechar tab |
| **Owner** | Dono da casa | Cardápio, mesas, staff, código público |
| **Platform** | Operador EaiMesa | Onboarding tenant, billing, suspender | 

## Personas

- **Dono** — 1 bar, ~10 mesas, quer menos hardware e pedido confiável.
- **Garçom** — gera QR na mesa, confirma fila, fecha quando caixa manda.
- **Cliente** — lê QR do garçom uma vez; resto no celular.

## MVP (fatia cobrável)

### Inclui

- Signup B2B: e-mail, CNPJ, CPF responsável, OTP
- Plano **Bar**: até 15 mesas, 1 venue, pedidos ilimitados
- Cardápio CRUD (texto, preço no servidor)
- Mesas + claim do garçom + PIN + cookie guest
- Fila staff (KDS na tela; sem térmica)
- Multi-tenant com `venue_id` em toda query
- Billing gate: venue suspenso não cria pedido

### Fora do MVP

- Pagamento da conta no app / split
- CPF do consumidor para pedir
- Agente impressora térmica
- Delivery, iFood, WhatsApp bot
- App nativo, domínio customizado por bar
- NFC-e

## Métricas de sucesso (piloto)

- Pedido remoto (só código da casa) → **403**
- Dois bares no mesmo DB → **isolamento** (A não lê B)
- Sábado com rede ruim → fila staff funciona; claim expirado não abre tab

## Naming / URLs

- Marca: **EaiMesa**
- Domínio alvo: `eaimesa.com.br`
- Path guest: `/{venuePublicId}` e `/{venuePublicId}/c/{claimToken}` (redirect após redeem)
