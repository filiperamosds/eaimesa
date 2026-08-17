# Setup de desenvolvimento

> Estado atual: **somente documentação**. Passos abaixo valem após scaffold do monorepo.

## Pré-requisitos

- Node.js 20 LTS
- pnpm 9+
- Docker Desktop (Postgres local)
- Git

## Bootstrap (quando existir código)

```bash
cd ~/Projetos/EaiMesa
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

URLs esperadas:

| App | URL |
|-----|-----|
| API | http://localhost:4000 |
| Guest PWA | http://localhost:3000 |
| Staff | http://localhost:3001 |

## docker-compose.yml (planejado)

Serviço `postgres:16` com volume nomeado; porta `5432`.

## Scripts planejados (package.json root)

- `pnpm dev` — sobe api + guest + staff
- `pnpm db:migrate` — migrations
- `pnpm db:seed` — venue demo + cardápio
- `pnpm test` — unit + integração isolamento tenant

## Seed demo

1 venue `demo` / `public_id=d1de031d33`
2 mesas, 5 itens cardápio
1 staff `garcom@demo.local` / senha em README local (nunca commitar)

## CI (futuro)

- Lint + typecheck
- Teste `venue A cannot read venue B order`
- Sem secrets no repo (gitleaks)

## WSL

Se desenvolver via VSL no Windows, rode comandos dentro do Ubuntu (`wsl -e bash -lc '...'`).
