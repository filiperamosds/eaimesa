# EaiMesa — API Laravel + MySQL

Backend REST no contrato de [`docs/api/endpoints.md`](docs/api/endpoints.md). Front Next: repositório **eaimesa-frontend** (porta 3000).

Stack: Laravel 13, PHP 8.3, **MySQL 8** (no lugar do Postgres/Fastify). Ver [ADR-016](../docs/decisions/ADR-016-laravel-mysql.md) no monorepo.

## Local

```bash
cp .env.example .env
php artisan key:generate
# MySQL 8: database/user `eaimesa` / `eaimesa`
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

Health: http://localhost:8000/health  
Base: http://localhost:8000/v1

No `.env`, `APP_URL` é a origem do Next (`http://localhost:3000`) — CORS e cookies. No front, `API_URL=http://localhost:8000`.

Seed: `dono@bardotiao.local` / `demo1234` · `dono@cafedalina.local` / `demo1234` · `ops@eaimesa.local` / `demo1234` · `garcom@bardotiao.local` / `demo1234`

## MySQL no lugar de índices parciais

Postgres tinha `UNIQUE … WHERE status = 'open'`. Aqui: colunas geradas (`STORED`) que ficam NULL quando a sessão/comanda não está aberta — UNIQUE no MySQL permite vários NULL.

Specs copiadas em [`docs/`](docs/).
