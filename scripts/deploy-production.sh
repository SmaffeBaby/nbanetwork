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

importer_was_running="$(docker inspect --format '{{.State.Running}}' nba-dashboard-contracts-importer-1 2>/dev/null || true)"
restore_importer_on_failure() {
  local deploy_status=$?
  if [[ "$deploy_status" -ne 0 && "$importer_was_running" == "true" ]]; then
    docker compose start contracts-importer || true
  fi
  exit "$deploy_status"
}
trap restore_importer_on_failure EXIT

docker compose stop contracts-importer
docker compose build frontend backend python-backend

# postgres is not a superuser in Supabase. Existing functions may belong to
# supabase_admin, so every schema migration runs as the database administrator.
docker exec -i "$DB_CONTAINER" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
  < supabase/migrations/20261025153000_hoopshype_contract_seasons.sql
docker exec -i "$DB_CONTAINER" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
  < supabase/migrations/20261025170000_canonical_game_marks.sql
docker exec -i "$DB_CONTAINER" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
  < supabase/migrations/20261025180000_game_predictions.sql
docker exec -i "$DB_CONTAINER" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
  < supabase/migrations/20261026230000_confirmed_registration_mail.sql
docker exec -i "$DB_CONTAINER" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
  < supabase/migrations/20261027001000_profile_experience.sql
docker exec -i "$DB_CONTAINER" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
  < supabase/migrations/20261028001000_fantasy.sql
docker exec -i "$DB_CONTAINER" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
  < supabase/migrations/20261028002000_fantasy_experience.sql
# Start the new app only after its required database objects are available.
docker compose up -d --no-build frontend backend python-backend
docker compose up -d --build --no-deps contracts-importer
trap - EXIT
docker compose ps frontend backend python-backend contracts-importer
