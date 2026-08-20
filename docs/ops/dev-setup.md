# Setup de desenvolvimento

## Pré-requisitos

- Node.js **20+** (recomendado 22; `.nvmrc` na raiz)
- pnpm 9+ (`corepack enable && corepack prepare pnpm@9 --activate`)
- PostgreSQL 16 — escolha **uma** origem:
  - **Cursor Cloud** (este repo no agente remoto) — Postgres nativo via apt; **não** use Docker nem Homebrew
  - **Mac local** — Homebrew (recomendado) **ou** Docker Compose
- Git

`DATABASE_URL` em todos os casos: `postgresql://eaimesa:eaimesa@localhost:5432/eaimesa` (só local/cloud de dev; nunca prod).

## Cursor Cloud (agente remoto)

O VM do Cloud Agent **não traz Docker** e não tem Homebrew. O Postgres sobe como serviço do Ubuntu.

Configuração versionada: `.cursor/environment.json`

| Fase | Script | O que faz |
|------|--------|-----------|
| `install` | `scripts/cursor-cloud/install.sh` | `apt` Postgres 16 + `pnpm install` + `.env` a partir do example |
| `start` | `scripts/cursor-cloud/start.sh` | liga o cluster, cria user/db `eaimesa`, `pnpm db:migrate` |

O daemon **precisa** estar no `start`: o `install` só deixa pacotes em disco; processos não sobrevivem ao snapshot/boot.

Num workspace Cloud já aberto (este agente, ou se o `start` ainda não rodou):

```bash
bash scripts/cursor-cloud/install.sh
bash scripts/cursor-cloud/start.sh
pnpm db:seed
pnpm dev
```

Agentes **novos** no mesmo repo leem `.cursor/environment.json` no commit de origem e rodam `install`/`start` sozinhos. Depois: `pnpm db:seed` (idempotente) e `pnpm dev`.

Não use `docker compose` neste VM. Homebrew (`brew services start postgresql@16`) é só Mac local.

## Bootstrap (sem Docker — Homebrew)

```bash
cd ~/Projetos/EaiMesa
nvm use
cp .env.example .env
pnpm install

brew install postgresql@16
brew services start postgresql@16
export PATH="/usr/local/opt/postgresql@16/bin:$PATH"   # Apple Silicon: /opt/homebrew/opt/postgresql@16/bin

createuser -l eaimesa || true
psql -d postgres -c "ALTER USER eaimesa WITH PASSWORD 'eaimesa';"
createdb -O eaimesa eaimesa || true

pnpm db:migrate
pnpm db:seed
pnpm dev
```

`DATABASE_URL` no `.env`: `postgresql://eaimesa:eaimesa@localhost:5432/eaimesa`

## Bootstrap (com Docker)

```bash
docker compose up -d postgres
pnpm db:migrate && pnpm db:seed && pnpm dev
```

URLs:

| App | URL |
|-----|-----|
| API | http://localhost:4000 |
| Web (landing, painel, cardápio) | http://localhost:3000 |
| Cardápio seed | http://localhost:3000/bar-do-tiao |
| Pedidos (Kanban) | http://localhost:3000/painel/pedidos |
| Mesas | http://localhost:3000/painel/mesas |
| Equipe | http://localhost:3000/painel/equipe |
| Garçom | http://localhost:3000/garcom |

Login demo abre direto o Kanban. Garçom demo: `garcom@bardotiao.local` / `demo1234`.

Não há segundo front na porta 3001.

## docker-compose.yml

Serviço `postgres:16`; usuário/senha/db `eaimesa`; porta `5432`; volume nomeado.

## Scripts (raiz)

- `pnpm dev` — api + web em paralelo
- `pnpm db:migrate` — aplica SQL em `packages/db/migrations`
- `pnpm db:seed` — Bar do Tião + cardápio
- `pnpm --filter @eaimesa/api dev`
- `pnpm --filter @eaimesa/web dev`

## Seed demo

| Campo | Valor |
|-------|--------|
| Venue | Bar do Tião |
| Slug | `bar-do-tiao` |
| E-mail | `dono@bardotiao.local` |
| Senha | `demo1234` (somente local; nunca prod) |
| Garçom | `garcom@bardotiao.local` / `demo1234` |

## Rede local (celular / tablet no mesmo Wi‑Fi)

Para testar QR e `/garcom` no celular, o Mac precisa aceitar conexões na LAN e as URLs do QR precisam apontar para o hostname da máquina — não `localhost`.

### 1. Nome do Mac na rede (Bonjour)

No Mac: **Ajustes do Sistema → Geral → Compartilhamento → Nome local** (ex. `mac-filipe`).

No iPhone/Android (mesmo Wi‑Fi), o endereço costuma ser:

```text
http://mac-filipe.local:3000/bar-do-tiao
```

Use **`.local`** — `mac-filipe:3000` sem `.local` muitas vezes não resolve no celular.

Alternativa: IP fixo do Mac na rede (ex. `http://192.168.0.42:3000/...`). Descubra com `ifconfig` ou Ajustes → Rede.

### 2. `.env` na raiz do projeto

Com o hostname que o celular vai usar:

```env
APP_URL=http://mac-filipe.local:3000
NEXT_PUBLIC_APP_URL=http://mac-filipe.local:3000
API_URL=http://localhost:4000
```

- `APP_URL` — CORS da API e **URL do QR de comanda** gerado pelo garçom (precisa ser alcançável pelo celular).
- `API_URL` — proxy interno do Next (`/v1/*` → `:4000`); pode continuar `localhost` porque só o servidor Next chama a API.
- Não defina `NEXT_PUBLIC_API_URL` para `:4000` no celular; o browser usa `/v1` no mesmo host `:3000`.

Reinicie `pnpm dev` após alterar o `.env`.

### 3. Servidor escutando na LAN

O script `pnpm dev` já sobe o Next em `0.0.0.0:3000` e a API em `0.0.0.0:4000`. Se ainda não abrir no celular:

- Firewall do Mac: permitir Node/Terminal em conexões recebidas.
- Celular e Mac na **mesma** rede Wi‑Fi (evitar rede de convidados isolada).

### 4. O que testar no celular

| URL | Uso |
|-----|-----|
| `http://mac-filipe.local:3000/bar-do-tiao` | Cardápio público |
| `http://mac-filipe.local:3000/garcom` | App garçom (login demo) |
| QR gerado em `/garcom` | Deve mostrar `mac-filipe.local` na URL, não `localhost` |

Garçom demo: `garcom@bardotiao.local` / `demo1234`.

## Página em branco / não carrega (fora do Cursor)

Sintoma: navegador fica carregando ou tela branca, terminal sem erro claro.

### Checklist (na raiz do repo, não dentro de `apps/web`)

```bash
cp .env.example .env    # se ainda não tiver
pnpm install
pnpm dev:check          # diagnóstico
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Aguarde no terminal aparecer **`✓ Ready`** do Next (primeira carga pode levar 10–30s).

### Causas frequentes

| Problema | Como ver | Correção |
|----------|----------|----------|
| Sem `.env` | API cai com `OWNER_JWT_SECRET ausente` | `cp .env.example .env` |
| Postgres parado | API não sobe / cardápio trava | `brew services start postgresql@16` ou `docker compose up -d postgres` |
| Migration 0006 faltando | Erro SQL ao logar/cadastrar garçom | `pnpm db:migrate` |
| Porta 3000 ocupada | Next não mostra Ready | `lsof -iTCP:3000 -sTCP:LISTEN` e encerre o processo |
| Rodou fora da raiz | `pnpm dev` não acha workspaces | `cd` até a pasta que tem `pnpm-workspace.yaml` |
| Só testar UI | API/DB ainda não prontos | `pnpm dev:web` → http://localhost:3000 |

### Teste mínimo

```bash
curl -I http://localhost:3000/
# esperado: HTTP/1.1 200
curl http://localhost:4000/health
# esperado: {"ok":true,"service":"eaimesa-api"}
```

Se `curl :3000` não responder, o Next não subiu — veja a saída completa do terminal (procure `EADDRINUSE` ou erro de compilação).

## Sem Docker

- **Mac local:** Postgres 16 via Homebrew (passos acima).
- **Cursor Cloud:** `scripts/cursor-cloud/` + `.cursor/environment.json` (não há Docker no VM).

Não use SQLite. `docker` no PATH **não** é obrigatório.

## CI (futuro)

- Lint + typecheck
- Isolamento: venue A não lê catálogo de B
- Sem secrets no repo (gitleaks)

## WSL

Se o ambiente for Windows/VDI, comandos dentro do Ubuntu (`wsl -e bash -lc '...'`).
