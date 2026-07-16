#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if git diff --quiet && git diff --cached --quiet; then
  echo "[ANDER Git] No hay cambios para subir."
  exit 0
fi

MESSAGE="${1:-Actualización móvil de ANDER CLOUD PC $(date '+%Y-%m-%d %H:%M')}"
git add .
git commit -m "$MESSAGE"
git push origin "$(git branch --show-current)"
echo "[ANDER Git] Cambios guardados en GitHub."
