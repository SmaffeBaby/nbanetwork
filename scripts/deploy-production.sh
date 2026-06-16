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

COMPOSE_FILES=(
  --project-directory .
  --env-file supabase/.env
  -f supabase/docker-compose.yml
  -f supabase/docker-compose.s3.yml
  -f docker-compose.yml
)

wait_for_healthy() {
  local container_id="$1"
  local timeout_seconds="${2:-120}"
  local started_at
  started_at="$(date +%s)"

  while true; do
    local status
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"

    if [[ "$status" == "healthy" || "$status" == "running" ]]; then
      return 0
    fi

    if (( $(date +%s) - started_at > timeout_seconds )); then
      echo "Timed out waiting for container $container_id to become healthy. Last status: ${status:-unknown}" >&2
      return 1
    fi

    sleep 2
  done
}

sync_supabase_db_bootstrap() {
  local postgres_password
  postgres_password="$(grep '^POSTGRES_PASSWORD=' supabase/.env | cut -d= -f2-)"

  local role_name
  for role_name in authenticator supabase_auth_admin supabase_storage_admin supabase_admin supabase_functions_admin supabase_read_only_user dashboard_user; do
    if docker exec -e PGPASSWORD="$postgres_password" "$db_container" \
      psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$role_name'" | grep -q 1; then
      docker exec -e PGPASSWORD="$postgres_password" "$db_container" \
        psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
        -c "ALTER USER \"$role_name\" WITH PASSWORD '$postgres_password';"
    fi
  done

  docker exec -e PGPASSWORD="$postgres_password" "$db_container" \
    psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
    -c "CREATE SCHEMA IF NOT EXISTS graphql_public; GRANT USAGE ON SCHEMA graphql_public TO postgres, anon, authenticated, service_role;"

  docker exec -e PGPASSWORD="$postgres_password" "$db_container" \
    psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
    -c "GRANT anon, authenticated, service_role TO supabase_storage_admin;"

  docker exec -i -e PGPASSWORD="$postgres_password" "$db_container" \
    psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/volumes/db/init/100-nba-dashboard.sql

  docker exec -i -e PGPASSWORD="$postgres_password" "$db_container" \
    psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
insert into storage.buckets (id, name, public)
values ('123', '123', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Team about assets are public" on storage.objects;
create policy "Team about assets are public"
on storage.objects for select
to anon, authenticated, service_role
using (bucket_id = '123');

drop policy if exists "Service role can manage team about assets" on storage.objects;
create policy "Service role can manage team about assets"
on storage.objects for all
to service_role
using (bucket_id = '123')
with check (bucket_id = '123');
SQL

  docker exec -e PGPASSWORD="$postgres_password" "$db_container" \
    psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
    -c "NOTIFY pgrst, 'reload schema';"
}

docker compose "${COMPOSE_FILES[@]}" up -d minio db
db_container="$(docker compose "${COMPOSE_FILES[@]}" ps -q db)"
wait_for_healthy "$db_container" 120
sync_supabase_db_bootstrap

docker compose "${COMPOSE_FILES[@]}" up -d minio-createbucket rest
docker compose "${COMPOSE_FILES[@]}" up -d --build --force-recreate storage frontend backend python-backend
docker compose "${COMPOSE_FILES[@]}" restart kong
docker compose "${COMPOSE_FILES[@]}" restart backend
docker compose "${COMPOSE_FILES[@]}" restart frontend
docker compose "${COMPOSE_FILES[@]}" ps minio minio-createbucket kong storage frontend backend python-backend
