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

## Production Supabase data

Production runtime data is kept outside the synced Supabase template directory:

```text
/opt/nba-dashboard/volumes
```

GitHub Actions excludes this directory from `rsync --delete`, and `scripts/deploy-production.sh` refuses to deploy if the production Postgres container is mounted from a different data directory.

## Reset local Supabase data

This deletes local Supabase data:

```sh
cd supabase
docker compose down -v
docker compose up -d
```


## HoopsHype contracts

`nba_team_contract_seasons` stores one validated HoopsHype snapshot per NBA team and salary season.
The browser importer has no database credentials. It exports public salary tables into the
`contract-imports` volume; backend validates them and writes through its existing service role.
The current season is checked every six hours. Historical seasons are discovered from the
site's selector, imported once, and resumed from saved snapshots after restart. Failed or empty
pages never replace successful records. Future contract years are stored with their source season.
An incomplete cycle retries missing pages after five minutes; successful historical pages are skipped.

Apply the additive migration to an existing installation:

```sh
docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/migrations/20261025153000_hoopshype_contract_seasons.sql
docker compose up -d --build contracts-importer backend frontend
```

Check browser import progress:

```sh
docker compose logs --tail=50 contracts-importer
docker compose exec -T contracts-importer cat /data/status.json
```

The importer uses standard Chromium with its sandbox and the official Playwright seccomp profile.
It stops on source access restrictions; saved salaries remain available through the application API.
No login, CAPTCHA bypass, alternate salary provider, or invented fallback payroll is used.
If the publisher restricts the server's browser as well, retry after access is restored.
Validated HTML exports from the public page can also be imported with
`node scripts/import-contracts.js --directory /path/to/exports` inside the backend container.
