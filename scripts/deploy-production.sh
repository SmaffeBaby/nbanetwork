#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/nba-dashboard}"

cd "$APP_DIR"

for required_file in .env supabase/.env vite-project/.env; do
  if [[ ! -f "$required_file" ]]; then
    echo "Missing production env file: $APP_DIR/$required_file" >&2
    exit 1
  fi
done

if [[ ! -f docker-compose.yml ]]; then
  echo "Missing docker-compose.yml in $APP_DIR" >&2
  exit 1
fi

docker compose up -d --build --remove-orphans
docker compose ps
