# Fluxos

## 0. Fatia 1 — publicar e ler o cardápio

Detalhe em [fatia-01-cardapio.md](fatia-01-cardapio.md).

```mermaid
sequenceDiagram
  participant D as Dono
  participant W as apps/web
  participant API as API
  participant C as Cliente

  D->>W: /cadastro (e-mail, senha, nome, slug)
  W->>API: POST /v1/auth/register
  API-->>W: Set-Cookie eaimesa_owner
  D->>W: /painel — Kanban de pedidos (abas: Pedidos, Cardápio, Mesas, Meu bar)
  W->>API: GET /v1/owner/orders
  D->>W: /painel/cardapio — categorias e itens
  W->>API: CRUD /v1/owner/catalog/**
  C->>W: GET /bar-do-tiao
  W->>API: GET /v1/public/venues/bar-do-tiao
  API-->>C: Cardápio (somente leitura)
```

1. Dono cria conta + venue (nome + slug único).
2. Monta categorias e itens (preço em centavos no servidor).
3. Comparte `https://eaimesa.com.br/{slug}` (QR fixo na mesa, Instagram, balcão) — **só cardápio**.
4. Cliente abre `/{slug}`: navega por **grupos**, toca o item para ver **foto** e descrição. **Não pede pelo link** (comanda exige QR do garçom). Pedidos de balcão: `/painel/pedidos`. Mesas + export do QR fixo: `/painel/mesas`.

## 0b. Fatia 2 — fila Kanban (balcão)

Detalhe em [fatia-02-pedidos.md](fatia-02-pedidos.md). O cliente **ainda não** pede pelo slug.

```mermaid
sequenceDiagram
  participant S as Staff (painel)
  participant API as API

  S->>API: POST /v1/owner/orders (itens + mesa)
  API-->>S: Pedido pending
  S->>API: PATCH status accepted / preparing / delivered
```

1. Staff entra (`/login`) e cai em `/painel/pedidos` (ou clica a aba **Pedidos**).
2. Lança pedido de balcão (escolhe a **mesa** cadastrada) ou vê os do seed.
3. Avança o card nas colunas até **Entregues**.

## 0c. Fatia 3 — cadastrar o salão

Detalhe em [fatia-03-mesas.md](fatia-03-mesas.md). Claim por mesa continua **fora**.

```mermaid
sequenceDiagram
  participant D as Dono
  participant API as API

  D->>API: POST /v1/owner/tables (rótulo)
  API-->>D: Mesa ativa
  D->>API: POST /v1/owner/orders (tableId + itens)
  API-->>D: Pedido pending com snapshot do rótulo
```

1. Dono abre **Mesas** e cadastra até 15 ativas (ex. Balcão, Mesa 1…10).
2. Exporta o **QR fixo** de cada mesa (destino: cardápio `/{slug}`) e cola no salão.
3. No Kanban, o pedido de balcão escolhe uma mesa ativa.
4. QR/claim do **garçom** (abre comanda): garçom em `/garcom` ou dono autenticado — fatia 4.

## 1. Onboarding do bar (B2B)

1. Dono cria conta (e-mail + senha).
2. Cadastra venue: nome e **slug** (`bar-do-tiao`). CNPJ, CPF responsável e OTP entram em fatia posterior.
3. Escolhe plano Bar; gateway marca `subscription_status = active` (fatia billing). Na fatia 1 o seed/cadastro fica em `trial`.
4. Sistema gera `public_id` opaco interno; a URL pública é o slug.
5. Dono cadastra cardápio (fatia 1), fila (fatia 2) e mesas (fatia 3).
6. Divulga `/{slug}` — **não** o claim.

## 2. Abertura da mesa (garçom → cliente)

```mermaid
sequenceDiagram
  participant D as Dono
  participant G as Garçom
  participant API as API
  participant C as Cliente

  D->>API: POST /v1/owner/staff (cadastro)
  G->>API: POST /v1/auth/login
  G->>API: POST /v1/staff/tables/{id}/claims
  API-->>G: claimUrl + TTL
  G->>C: Cliente escaneia QR
  C->>API: POST /v1/public/venues/{slug}/c/{token}/redeem
  API->>API: TableSession + PIN + GuestSession
  API-->>C: pinDisplay → /{slug}/bem-vindo (PIN + nome/telefone)
```

1. Dono cadastra garçons em **Equipe** (`/painel/equipe`).
2. Garçom entra em `/login` → `/garcom`, escolhe mesa, mostra QR (countdown ~3 min).
3. Cliente escaneia → redeem → PIN da mesa + **nome e telefone** (comanda pessoal).
4. Pedido pelo cardápio exige comanda pessoal aberta (fatia seguinte).

## 3. Outros celulares na mesa (fatia 5)

Detalhe em [fatia-05-pin-join.md](fatia-05-pin-join.md).

```mermaid
sequenceDiagram
  participant C2 as Outro celular
  participant API as API

  C2->>API: POST /v1/guest/tabs/join { slug, pin }
  API->>API: TableSession open + PIN
  API-->>C2: Set-Cookie eaimesa_guest
  C2->>API: POST /v1/guest/tabs { name, phone }
  API-->>C2: comanda pessoal (ou retoma se o telefone já existe)
```

1. Cliente abre `/{slug}` (QR fixo) ou `/{slug}/entrar`.
2. Informa o PIN de 4 dígitos da **mesa**.
3. Nome + telefone → comanda pessoal na mesma ocupação.
4. Garçom **não** precisa voltar.

## 4. Pedido

*Fatia futura (carrinho guest).* Pedidos que existirem gravam `tab_id` da comanda pessoal.

## 5. Fechamento (fatia 6)

Detalhe em [fatia-06-comandas-individuais.md](fatia-06-comandas-individuais.md).

1. Staff: `POST /v1/staff/tabs/{id}/close` — fecha **uma** comanda (revoga sessões daquela conta).
2. Staff: `POST /v1/staff/tables/{id}/close` — encerra a **mesa** só se todas as comandas estão `closed`.
3. Próxima rodada na mesa = novo claim (novo PIN).

## 6. Venue suspenso (billing)

- `GET /{slug}` → cardápio + aviso “assinatura inativa”.
- `POST /guest/orders` → **402/403**.
- Tabs abertas ainda podem **fechar**.

Na fatia 1, `suspended` ainda mostra o cardápio (read-only) com aviso, se o status estiver setado.

## Estados da Tab

| Estado | Guest | Staff |
|--------|-------|-------|
| `open` | Comanda da pessoa | Parcial no dialog da mesa |
| `closed` | Precisa de nova comanda | Arquivo; mesa só encerra se todas closed |

## Impressora (fase 2)

Após `accepted`, job `print_pending` para agente local do venue. Falha de print **não** cancela pedido — fila na tela permanece.
