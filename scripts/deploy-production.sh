#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/nba-dashboard}"
PRODUCTION_VOLUMES_DIR="$APP_DIR/volumes"
PRODUCTION_DB_DATA_DIR="$PRODUCTION_VOLUMES_DIR/db/data"
DB_CONTAINER="${DB_CONTAINER:-nba-dashboard-db-1}"

cd "$APP_DIR"

for required_file in .env supabase/.env vite-project/.env backend/headers.conf; do
  if [[ ! -f "$required_file" ]]; then
    echo "Missing production file: $APP_DIR/$required_file" >&2
    exit 1
  fi
done

if docker inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  db_data_mount="$(
    docker inspect "$DB_CONTAINER" \
      --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Source}}{{end}}{{end}}'
  )"

  if [[ "$db_data_mount" != "$PRODUCTION_DB_DATA_DIR" ]]; then
    echo "Unexpected production database mount for $DB_CONTAINER:" >&2
    echo "  actual:   ${db_data_mount:-<empty>}" >&2
    echo "  expected: $PRODUCTION_DB_DATA_DIR" >&2
    echo "Refusing deploy because production Supabase data must live under $PRODUCTION_VOLUMES_DIR." >&2
    exit 1
  fi
fi

docker compose up -d --build frontend backend python-backend
docker compose ps frontend backend python-backend
