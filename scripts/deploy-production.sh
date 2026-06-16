#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/nba-dashboard}"

cd "$APP_DIR"

for required_file in .env supabase/.env vite-project/.env backend/headers.conf; do
  if [[ ! -f "$required_file" ]]; then
    echo "Missing production file: $APP_DIR/$required_file" >&2
    exit 1
  fi
done

docker compose up -d --build frontend backend python-backend
docker compose ps frontend backend python-backend
