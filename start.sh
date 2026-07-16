#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Se creó .env. Cambia ANDER_PASSWORD antes de exponer el sistema a Internet."
fi
mkdir -p data/linux data/chromium data/code-server data/workspace
chmod 700 data || true
docker compose pull
docker compose up -d
printf '\nANDER CLOUD PC iniciado.\n'
printf 'Abre: http://localhost:%s\n' "$(grep '^ANDER_PORT=' .env | cut -d= -f2 || echo 8080)"
