# Setup de desenvolvimento

## Pré-requisitos

- Node.js **20+** (recomendado 22; `.nvmrc` na raiz)
- pnpm 9+ (`corepack enable && corepack prepare pnpm@9 --activate`)
- PostgreSQL 16 — **Homebrew** (recomendado neste Mac, sem Docker) **ou** Docker Compose
- Git

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

## Sem Docker

Use Postgres 16 via Homebrew (passos acima). Não use SQLite. `docker` no PATH **não** é obrigatório.

## CI (futuro)

- Lint + typecheck
- Isolamento: venue A não lê catálogo de B
- Sem secrets no repo (gitleaks)

## WSL

Se o ambiente for Windows/VDI, comandos dentro do Ubuntu (`wsl -e bash -lc '...'`).
