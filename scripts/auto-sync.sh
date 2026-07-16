#!/usr/bin/env bash
set -u
cd "$(git rev-parse --show-toplevel)"
INTERVAL="${ANDER_SYNC_INTERVAL:-60}"

echo "[ANDER Sync] Vigilando cambios remotos cada ${INTERVAL}s."
while true; do
  sleep "$INTERVAL"

  # Nunca pisa trabajo local ni commits sin subir.
  if ! git diff --quiet || ! git diff --cached --quiet; then
    continue
  fi

  BRANCH="$(git branch --show-current 2>/dev/null || true)"
  [ -n "$BRANCH" ] || continue

  git fetch origin "$BRANCH" --quiet 2>/dev/null || continue
  LOCAL="$(git rev-parse HEAD 2>/dev/null || true)"
  REMOTE="$(git rev-parse "origin/$BRANCH" 2>/dev/null || true)"
  BASE="$(git merge-base HEAD "origin/$BRANCH" 2>/dev/null || true)"

  # Solo fast-forward cuando el Codespace no tiene cambios ni commits propios.
  if [ -n "$LOCAL" ] && [ "$LOCAL" = "$BASE" ] && [ "$LOCAL" != "$REMOTE" ]; then
    echo "[ANDER Sync] Hay cambios nuevos en GitHub. Actualizando editor..."
    git pull --ff-only origin "$BRANCH" || true
  fi
done
