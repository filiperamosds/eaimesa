# Visão do produto

## Problema

Bares pequenos usam tablets fixos na mesa (caro, sujo, gargalo) ou garçom anotando no papel (erro, fila). Cardápio QR “solto” permite pedido remoto se o link autorizar pedir.

## Proposta EaiMesa

Plataforma **SaaS multi-tenant**: cada estabelecimento paga aluguel mensal; o consumidor **não paga** a plataforma e **não instala app**.

| Peça | Função |
|------|--------|
| **Slug da casa** (`/bar-do-tiao`) | URL pública configurável. Cardápio. **Não autoriza pedir.** |
| **Claim do garçom** (`/bar-do-tiao/c/{token}`) | Secret de uso único, TTL curto. Abre a **mesa** (PIN do grupo). |
| **PIN da mesa** | Outros aparelhos entram na ocupação (`/{slug}/entrar`). |
| **Comanda pessoal** | Nome + telefone; várias por mesa. |
| **Cookie guest** (`eaimesa_guest`) | Sessão httpOnly após redeem/PIN; liga à comanda depois do cadastro. |
| **Cookie dono** (`eaimesa_owner`) | Sessão do estabelecimento no painel. |

## Superfícies

Tudo no **mesmo** frontend (`apps/web`). Ver [ADR-003](../decisions/ADR-003-frontend-unico.md), [fatia 1](fatia-01-cardapio.md) e [fatia 2](fatia-02-pedidos.md).

| Superfície | Rota | Usuário | Fatia 9 | MVP completo |
|------------|------|---------|---------|--------------|
| **Landing** | `/` | Visitante B2B | Sim | Sim |
| **Auth estabelecimento** | `/cadastro`, `/login` | Dono / garçom | Sim | Sim |
| **Painel** | `/painel/*` | Dono | Cardápio, Kanban (guest + balcão), mesas, equipe | — |
| **Garçom** | `/garcom` | Staff | QR + dialog + **Kanban** | — |
| **Cardápio público** | `/{slug}` | Cliente | PIN + comanda + carrinho + **parcial** | — |
| **Platform** | futuro | Operador EaiMesa | Não | Onboarding, billing, suspender |

## Personas

- **Dono** — 1 bar, ~10 mesas, quer menos hardware e pedido confiável. Publica o cardápio, vê a fila, cadastra o salão e a equipe.
- **Garçom** — gera QR na mesa; vê parciais; avança a fila; encerra a mesa quando todas as comandas fecham.
- **Cliente** — lê o cardápio; entra na mesa com QR/PIN; abre **comanda pessoal**; pede pelo celular; vê a **parcial**.

## Fatia atual vs MVP

Implementação **agora**: [fatia 9 — parcial do cliente](fatia-09-parcial-guest.md).

### MVP (quando as fatias somarem)

- Signup B2B: e-mail, senha; CNPJ/OTP entram depois
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

- Pedido remoto (só slug da casa) → **403** (quando houver pedido)
- Dois bares no mesmo DB → **isolamento** (A não lê B)
- `/{slug}` de um bar não lista itens de outro
- Sábado com rede ruim → fila staff funciona; claim expirado não abre tab

## Naming / URLs

- Marca: **EaiMesa**
- Domínio alvo: `eaimesa.com.br`
- Path do cardápio: `/{slug}` (ex. `/bar-do-tiao`) — [ADR-004](../decisions/ADR-004-slug-publico.md)
- Path de claim: `/{slug}/c/{claimToken}` (redirect após redeem)
- Path de PIN join: `/{slug}/entrar`
- `venue.public_id` opaco existe no banco; **não** é a URL do cardápio na fatia 1
