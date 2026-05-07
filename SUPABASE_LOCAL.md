# Local Supabase

This project uses the official self-hosted Supabase Docker stack in `supabase/`.

## Start with the whole app

```sh
docker compose up -d --build
docker compose ps
```

The root Compose file includes `supabase/docker-compose.yml`, so Supabase services are started inside the `nba-dashboard` project.

## Start Supabase only

```sh
cd supabase
docker compose pull
docker compose up -d
docker compose ps
```

Supabase API and Studio are available at:

- API: `http://127.0.0.1:8010`
- Studio: `http://127.0.0.1:8010`

Studio uses `DASHBOARD_USERNAME` and `DASHBOARD_PASSWORD` from `supabase/.env`.

## Frontend env

The Vite app reads:

```sh
VITE_SUPABASE_URL=http://127.0.0.1:8010
VITE_SUPABASE_ANON_KEY=<SUPABASE_PUBLISHABLE_KEY from supabase/.env>
```

The current local values were written to `.env` and `vite-project/.env`.

## Database schema

The app schema is initialized by:

```text
supabase/volumes/db/init/100-nba-dashboard.sql
```

It creates `profiles` and `map_points`, enables RLS, and adds `profiles` to the realtime publication. The migration runs only when the Supabase Postgres data directory is first created.

## Reset local Supabase data

This deletes local Supabase data:

```sh
cd supabase
docker compose down -v
docker compose up -d
```
