#!/usr/bin/env bash
# Pacotes e deps duráveis para Cloud Agents. Não sobe o daemon do Postgres
# (processos não sobrevivem ao snapshot / ao próximo boot — ver start.sh).
set -euo pipefail
cd "$(dirname "$0")/../.."

export DEBIAN_FRONTEND=noninteractive

sudo apt-get update -qq
sudo apt-get install -y -qq postgresql-16 postgresql-contrib-16 postgresql-client-16

corepack enable
corepack prepare pnpm@9.15.9 --activate

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

pnpm install
