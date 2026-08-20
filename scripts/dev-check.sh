#!/usr/bin/env bash
# Diagnóstico rápido antes de pnpm dev (Mac/WSL/Linux)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

echo "EaiMesa — dev-check"
echo "Raiz: $ROOT"
echo

# Node / pnpm
command -v node >/dev/null || fail "Node não encontrado. Use Node 20+."
NODE_V=$(node -p "process.versions.node")
ok "Node $NODE_V"

if ! command -v pnpm >/dev/null; then
  fail "pnpm não encontrado. Rode: corepack enable && corepack prepare pnpm@9 --activate"
fi
ok "pnpm $(pnpm -v)"

# .env
if [[ ! -f .env ]]; then
  fail "Arquivo .env ausente. Rode: cp .env.example .env"
fi
ok ".env existe"

# Variáveis obrigatórias da API
missing=()
for v in OWNER_JWT_SECRET GUEST_SESSION_SECRET DATABASE_URL; do
  if ! grep -q "^${v}=" .env 2>/dev/null || grep -q "^${v}=$" .env 2>/dev/null; then
    missing+=("$v")
  fi
done
if ((${#missing[@]})); then
  fail "Variáveis vazias/ausentes no .env: ${missing[*]}"
fi
ok "Secrets JWT e DATABASE_URL presentes"

# node_modules
if [[ ! -d node_modules ]]; then
  fail "node_modules ausente. Rode: pnpm install (na raiz do repo)"
fi
ok "node_modules na raiz"

# Postgres
if command -v pg_isready >/dev/null; then
  if pg_isready -q 2>/dev/null; then
    ok "Postgres responde (pg_isready)"
  else
    warn "Postgres não responde. Suba o serviço (brew services / docker compose)"
  fi
else
  warn "pg_isready não instalado — pule checagem de Postgres"
fi

# Portas
for port in 3000 4000; do
  if command -v lsof >/dev/null && lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    warn "Porta $port em uso (pode ser pnpm dev antigo). Veja: lsof -iTCP:$port -sTCP:LISTEN"
  else
    ok "Porta $port livre"
  fi
done

# Migrations
if command -v psql >/dev/null && grep -q "^DATABASE_URL=" .env; then
  # shellcheck disable=SC1091
  set -a && source .env && set +a
  if psql "$DATABASE_URL" -tAc "SELECT 1 FROM schema_migrations WHERE id='0006_venue_members.sql'" 2>/dev/null | grep -q 1; then
    ok "Migration 0006 (venue_members) aplicada"
  else
    warn "Migration 0006 não aplicada. Rode: pnpm db:migrate"
  fi
fi

echo
echo "Se tudo ok acima, na raiz do repo:"
echo "  pnpm db:migrate && pnpm db:seed && pnpm dev"
echo
echo "Teste no navegador (aguarde ~10s na 1ª carga):"
echo "  http://localhost:3000"
echo "  http://localhost:3000/bar-do-tiao"
echo
echo "Só o front (sem API): pnpm dev:web"
