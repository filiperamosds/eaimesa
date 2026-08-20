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

| Superfície | Rota | Usuário | Fatia 10 | MVP completo |
|------------|------|---------|----------|--------------|
| **Landing** | `/` | Visitante B2B | Dois cards (Cardápio + Auto atendimento) com valor | Sim |
| **Auth estabelecimento** | `/cadastro`, `/login` | Dono / garçom | Trial 7 dias no plano escolhido | Sim |
| **Painel** | `/painel/*` | Dono | Cardápio; resto só no Auto atendimento | — |
| **Pagamento** | `/painel/pagamento` | Dono | Checkout stub (sucesso) | Gateway |
| **Garçom** | `/garcom` | Staff | Só Auto atendimento | — |
| **Cardápio público** | `/{slug}` | Cliente | Sempre leitura; pedido só Auto atendimento | — |
| **Platform** | futuro | Operador EaiMesa | Não | Onboarding, billing real |

## Personas

- **Dono** — 1 bar, ~10 mesas, quer menos hardware e pedido confiável. Publica o cardápio, vê a fila, cadastra o salão e a equipe.
- **Garçom** — gera QR na mesa; vê parciais; avança a fila; encerra a mesa quando todas as comandas fecham.
- **Cliente** — lê o cardápio; entra na mesa com QR/PIN; abre **comanda pessoal**; pede pelo celular; vê a **parcial**.

## Fatia atual vs MVP

Implementação **agora**: [fatia 10 — planos](fatia-10-planos.md).

### MVP (quando as fatias somarem)

- Signup B2B: e-mail, senha; CNPJ/OTP entram depois
- Planos **Cardápio** e **Auto atendimento**; trial 7 dias
- Cardápio CRUD (texto, preço no servidor)
- Auto atendimento: mesas + claim + PIN + pedido guest + fila staff
- Multi-tenant com `venue_id` em toda query
- Billing stub + gate: trial/vigência expirada não opera comanda

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
