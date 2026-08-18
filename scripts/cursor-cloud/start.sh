#!/usr/bin/env bash
# Sobe o Postgres 16 local em cada boot do Cloud Agent (idempotente).
# Credenciais locais = .env.example (nunca usar em prod).
set -euo pipefail
cd "$(dirname "$0")/../.."

PG_USER="eaimesa"
PG_PASSWORD="eaimesa"
PG_DB="eaimesa"
PG_HOST="127.0.0.1"
PG_PORT="5432"

start_cluster() {
  if command -v pg_lsclusters >/dev/null 2>&1 && pg_lsclusters --no-header 2>/dev/null | grep -q .; then
    sudo pg_ctlcluster 16 main start || sudo service postgresql start
  elif command -v pg_createcluster >/dev/null 2>&1; then
    sudo pg_createcluster 16 main --start
  else
    sudo service postgresql start
  fi
}

if ! pg_isready -h "$PG_HOST" -p "$PG_PORT" -q 2>/dev/null; then
  start_cluster
fi

for _ in $(seq 1 30); do
  if pg_isready -h "$PG_HOST" -p "$PG_PORT" -q; then
    break
  fi
  sleep 1
done

if ! pg_isready -h "$PG_HOST" -p "$PG_PORT" -q; then
  echo "Postgres não ficou pronto em ${PG_HOST}:${PG_PORT}" >&2
  exit 1
fi

sudo -u postgres createuser -l "$PG_USER" 2>/dev/null || true
sudo -u postgres psql -d postgres -v ON_ERROR_STOP=1 \
  -c "ALTER USER ${PG_USER} WITH PASSWORD '${PG_PASSWORD}';"
sudo -u postgres createdb -O "$PG_USER" "$PG_DB" 2>/dev/null || true

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

if [[ -x node_modules/.bin/tsx ]] || [[ -d node_modules/.pnpm ]]; then
  pnpm db:migrate
fi

echo "Postgres pronto em postgresql://${PG_USER}@${PG_HOST}:${PG_PORT}/${PG_DB}"
