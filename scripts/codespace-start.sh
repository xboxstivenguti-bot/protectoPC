#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Actualiza el editor al abrir el Codespace, pero no enciende la PC automáticamente.
if git diff --quiet && git diff --cached --quiet; then
  BRANCH="$(git branch --show-current 2>/dev/null || true)"
  if [ -n "$BRANCH" ]; then
    git pull --ff-only origin "$BRANCH" || true
  fi
fi

cp -n .env.example .env 2>/dev/null || true
mkdir -p data/linux data/chromium data/code-server data/workspace
chmod +x start.sh stop.sh scripts/*.sh 2>/dev/null || true

# Mantiene el editor sincronizado sin pisar cambios locales.
if ! pgrep -f "scripts/auto-sync.sh" >/dev/null 2>&1; then
  nohup bash scripts/auto-sync.sh > /tmp/ander-auto-sync.log 2>&1 &
fi

echo "[ANDER] Abre start.js y pulsa Play para encender toda la PC."
