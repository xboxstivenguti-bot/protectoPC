#!/usr/bin/env bash
set -u
cd "$(git rev-parse --show-toplevel)"

INTERVAL="${ANDER_SYNC_INTERVAL:-25}"
PORT="${ANDER_PORT:-8080}"
LOCK="/tmp/ander-auto-sync.busy"

echo "[ANDER Sync] Vigilando cambios remotos cada ${INTERVAL}s."

public_url() {
  if [ -n "${CODESPACE_NAME:-}" ]; then
    echo "https://${CODESPACE_NAME}-${PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  else
    echo "http://127.0.0.1:${PORT}"
  fi
}

wait_for_port() {
  local tries=0
  while [ "$tries" -lt 60 ]; do
    if curl -sS -o /dev/null --max-time 3 "http://127.0.0.1:${PORT}/"; then
      return 0
    fi
    tries=$((tries + 1))
    sleep 2
  done
  return 1
}

while true; do
  sleep "$INTERVAL"

  # No se solapa con una actualización anterior que siga en curso.
  [ -f "$LOCK" ] && continue

  # Nunca pisa cambios sin guardar ni commits propios pendientes de subir.
  if ! git diff --quiet || ! git diff --cached --quiet; then
    continue
  fi
  if [ -n "$(git status --porcelain --untracked-files=normal)" ]; then
    continue
  fi

  BRANCH="$(git branch --show-current 2>/dev/null || true)"
  [ -n "$BRANCH" ] || continue

  git fetch origin "$BRANCH" --quiet 2>/dev/null || continue
  LOCAL="$(git rev-parse HEAD 2>/dev/null || true)"
  REMOTE="$(git rev-parse "origin/$BRANCH" 2>/dev/null || true)"
  BASE="$(git merge-base HEAD "origin/$BRANCH" 2>/dev/null || true)"

  # Solo fast-forward: el Codespace no tiene commits propios sin subir.
  if [ -z "$LOCAL" ] || [ "$LOCAL" != "$BASE" ] || [ "$LOCAL" = "$REMOTE" ]; then
    continue
  fi

  touch "$LOCK"

  OLD_HASH="$LOCAL"
  echo "[ANDER Sync] Hay cambios nuevos en GitHub (${OLD_HASH:0:7} -> ${REMOTE:0:7}). Actualizando..."

  if ! git pull --ff-only origin "$BRANCH"; then
    echo "[ANDER Sync] git pull falló, no se aplicó nada."
    rm -f "$LOCK"
    continue
  fi

  NEW_HASH="$(git rev-parse HEAD)"
  CHANGED_FILES="$(git diff --name-only "$OLD_HASH" "$NEW_HASH")"
  echo "[ANDER Sync] Archivos actualizados:"
  echo "$CHANGED_FILES" | sed 's/^/  - /'

  # Si algo fuera de frontend/ cambió, esos servicios necesitan reconstruirse.
  # frontend/ se sirve montado directo por Caddy: no requiere ningun paso de Docker.
  NEEDS_DOCKER=0
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    case "$file" in
      frontend/*) ;;
      *) NEEDS_DOCKER=1 ;;
    esac
  done <<< "$CHANGED_FILES"

  if [ "$NEEDS_DOCKER" -eq 1 ]; then
    echo "[ANDER Sync] Cambios fuera de frontend/: actualizando contenedores (sin bajar nada)..."
    if docker compose up -d --build --remove-orphans; then
      if wait_for_port; then
        echo "[ANDER Sync] Listo. $(public_url)"
      else
        echo "[ANDER Sync] Los contenedores se actualizaron pero el puerto ${PORT} no respondió a tiempo. Revisa: docker compose logs -f --tail=150"
      fi
    else
      echo "[ANDER Sync] docker compose up --build falló. Revisa: docker compose logs -f --tail=150"
    fi
  else
    echo "[ANDER Sync] Solo cambió frontend/ (servido directo por Caddy): no hace falta tocar Docker. $(public_url)"
  fi

  rm -f "$LOCK"
done
