#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Trae cambios remotos al iniciar, únicamente si no hay cambios locales.
if git diff --quiet && git diff --cached --quiet; then
  BRANCH="$(git branch --show-current 2>/dev/null || true)"
  if [ -n "$BRANCH" ]; then
    git pull --ff-only origin "$BRANCH" || true
  fi
fi

cp -n .env.example .env 2>/dev/null || true
mkdir -p data/linux data/chromium data/code-server data/workspace

# Inicia el auto-sync sin duplicarlo.
if ! pgrep -f "scripts/auto-sync.sh" >/dev/null 2>&1; then
  nohup bash scripts/auto-sync.sh > /tmp/ander-auto-sync.log 2>&1 &
fi

# Levanta ANDER CLOUD PC. Si Docker aún está arrancando, no bloquea el editor.
if command -v docker >/dev/null 2>&1; then
  bash ./start.sh || echo "[ANDER] Docker todavía no está listo. Ejecuta la tarea: ANDER: Iniciar PC"
fi
