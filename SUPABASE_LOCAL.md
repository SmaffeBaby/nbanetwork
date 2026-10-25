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

## Canonical game IDs and profile marks

Calendars, upcoming fixtures and game detail data use ESPN. Public links use the numeric ESPN
ID; API and profile records use `espn:<id>`. Legacy NBA links are resolved using date and both
oriented teams from their table row, saved calendars or NBA metadata. An ambiguous ESPN match
is rejected rather than falling back to a different provider's detail data.

Apply `supabase/migrations/20261025170000_canonical_game_marks.sql` on existing databases.
The authenticated `/api/profile-games/favorite` and `/api/profile-games/watched` endpoints
accept an explicit active state and store an ESPN-verified snapshot. The restricted
`set_profile_game` function locks the profile row, updates one mark atomically and consolidates
legacy NBA/unprefixed ESPN duplicates in both lists. Repeated requests are idempotent.
Old saved snapshots remain readable and are consolidated when that game is marked again.

Checks: `node --test backend/tests/game-identity.test.js`,
`cd vite-project && node --test tests/game-identity.cjs`, and the rollback-only
`backend/tests/game-marks.sql` database test. The optional local integration test
`backend/tests/game-marks.integration.js` creates and removes its own temporary Auth user.

## Pre-game pages and predictions

`/pre-game/<ESPN ID>` shows a countdown, projected ESPN depth-chart lineups (confirmed starters
when available), availability reports, season team averages and roster leaders in points,
rebounds and steals. Current-season data is validated; missing data stays unavailable rather
than falling back to a different season. Team resources and player statistics share server
caches; the page uses TanStack Query and switches to `/game/<ID>` when ESPN reports live/final.

Apply `supabase/migrations/20261025180000_game_predictions.sql` on existing databases.
Predictions require a verified session and are stored in `game_predictions` with one vote per
user/game. The server validates ESPN state and Postgres enforces the tipoff cutoff under a poll
row lock. Public results expose only profile names, avatar URLs and links (up to 24 voters per
side), never emails. Users may change or cancel votes until tipoff.

Backend maintenance checks started polls every five minutes and records the first confirmed
completion/cancellation. Postgres cron removes polls and their votes 24 hours later (up to a
15-minute cleanup interval). Backend maintenance also runs the same cleanup as a fallback.
It does not delete users' profile images, favorites, watched games or comments.

Checks: `node --test backend/tests/game-preview.test.js`, `backend/tests/game-predictions.sql`
(rollback-only), `cd vite-project && node --test tests/pre-game.cjs`.
The optional local `backend/tests/game-predictions.integration.js` creates and removes only its
own temporary test account and verifies real preview/voting API behavior.
