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

On small production hosts the browser must leave resources for the application and database.
Compose limits the importer to 0.25 CPU, 512 MiB RAM, 768 MiB total RAM plus swap,
and 192 processes. Each team uses a fresh browser context; images, fonts, media and
advertising frame navigations are blocked while table documents and scripts remain enabled.
The production deploy script stops the importer before application builds and restarts it
after migrations. Existing snapshots remain readable throughout this pause.

The 4 GiB production host also has a persistent 2 GiB swap file at
`/swapfile-basketsfera`, registered in `/etc/fstab`, with `vm.swappiness=10` in
`/etc/sysctl.d/90-basketsfera-memory.conf`. Swap is a reserve, not a replacement for
the importer limits. Check `free -m`, `vmstat 1 5` and `docker stats --no-stream`
when diagnosing latency. News slider database reads time out after five seconds;
the browser request has a twelve-second timeout and keeps previously cached slides.

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

`cd vite-project && node --test tests/game-identity.cjs`, and the rollback-only

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

(rollback-only), `cd vite-project && node --test tests/pre-game.cjs`.
own temporary test account and verifies real preview/voting API behavior.

## Page titles and patch-note editor

The router sets `Basketsfera` for home and content titles ending in `| Basketsfera.ru` elsewhere.
Async article, profile, game and pre-game titles use scoped watchers so an old request cannot
replace the title after navigation. The initial HTML title is also branded.

Patch notes load through `/api/patch-notes`. Writes use authenticated API requests; the server
checks the current profile's admin flag and validates content/links. New drafts retain a UUID
across retries, so uncertain responses do not create duplicate notes. The editor always exits
its saving state after failure and retains text and links. Newer typing is preserved when a
previous save finishes. Per-account `sessionStorage` drafts survive focus loss, route changes
and reloads in the same tab; successful save or explicit close clears the draft.

Checks: `cd vite-project && node --test tests/titles-and-patch-drafts.cjs` and
using invalid payloads; it never publishes a test patch note.

## First production contracts import and history recovery

The contracts worker completes a current-season pass across all 30 teams before processing
historical seasons. This prevents teams later in the list from being unavailable while an
initial archive import runs. Existing snapshots that cannot be read are preserved and logged;
a permission/read error is never treated as an empty team.

For an explicitly authorized bootstrap from existing public HoopsHype snapshots, merge pages
by team/season and retain the newest `fetchedAt`. Stop the worker during replacement and ensure
`/data/snapshots` and its files belong to `pwuser` before restarting. Backend validates the
files and imports them through its normal queue. Copying files as root without restoring
ownership can otherwise force unnecessary downloads or prevent automatic refreshes.

Application deployment does not copy local profile history into production. To recover an
explicitly requested user's missing history, back up that production row, lock it during the
merge, and append only missing game IDs/matches. Preserve existing production entries and
unrelated fields (especially favorites); never replace the production profile/database with
a local dump. `set_profile_game` also preserves unrelated legacy entries with absent IDs or


## Registration email and password recovery

Mail is sent from `basketsfera@inbox.ru` through `smtp.mail.ru:465` with TLS.
Set `SMTP_USER`, `SMTP_PASS` (Mail.ru application password), `SMTP_ADMIN_EMAIL`,
`SMTP_HOST`, `SMTP_PORT`, and `SMTP_SENDER_NAME` in the ignored `supabase/.env`.
Never put SMTP credentials in Vite variables, tracked files or browser code.
`ENABLE_EMAIL_AUTOCONFIRM=false` is required. Auth sends a six-digit code valid for
10 minutes, with a 60-second resend interval. Auth fetches the confirmation and
recovery templates from the backend's internal HTTP endpoint.

Apply `supabase/migrations/20261026230000_confirmed_registration_mail.sql` before
running the updated app. It creates profiles only after email confirmation and queues
separate welcome/admin notifications. The backend retries failed notifications;
SMTP delivery is at least once (a crash immediately after sending may cause a duplicate).
Existing accounts remain unchanged. Recovery uses a one-time token, a new password
and matching confirmation; it ends the recovery session after saving.

Rebuild `backend` and `frontend`, then recreate `auth` with the updated server env:

```sh
docker exec -i nba-dashboard-db-1 psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/migrations/20261026230000_confirmed_registration_mail.sql
docker compose up -d --build --no-deps backend frontend
docker compose --env-file supabase/.env -f supabase/docker-compose.yml -p nba-dashboard up -d --no-deps auth
```

For production, set `SITE_URL` to the public HTTPS origin and add its exact
`/reset-password` URL to `ADDITIONAL_REDIRECT_URLS`. Also use the public Supabase URL
in `API_EXTERNAL_URL` and `VITE_SUPABASE_URL`; localhost URLs work only on this computer.
Serve the website over HTTPS in production.

Only outgoing TCP 465 to Mail.ru is needed for SMTP. Do not publish a local SMTP,
IMAP or POP port. Browser traffic uses the site's HTTP/HTTPS and configured Supabase
API endpoint. The local stack publishes HTTP on 80 and the Supabase gateway on 8010;
backend 3000 and Python 8000 are bound to loopback. A production reverse proxy may
serve both website and Supabase over 443, with 8010 kept private.

Validation:

```sh
npm run build --prefix vite-project
```

## Profile XP and social links

Apply the additive, repeatable migration locally before rebuilding backend/frontend:

```sh
docker exec -i nba-dashboard-db-1 psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 < supabase/migrations/20261027001000_profile_experience.sql
docker compose up -d --build --no-deps backend frontend
```

`profiles` may be owned by `supabase_admin`, so this migration uses that role.
The new append-only XP ledger is writable only by trusted server operations.
A watched mark grants 30 XP once per canonical ESPN game; removing/re-adding it
never farms XP or revokes earned experience. Future, postponed and cancelled games
cannot be newly marked watched. Correct pregame predictions grant 100 XP once after
ESPN confirms the final winner; cancelled or unreliable results grant nothing.
Votes are cleaned only after settlement, while XP history survives poll deletion.
Previously deleted predictions cannot be reconstructed. Existing watched games are
credited once at migration time; captured legacy NBA IDs are resolved in small
background batches without modifying the user's saved marks.

Level N starts at `150 * N * (N - 1)` XP. Each level requires `300 * N` XP to reach
the next. Overall levels have no rank titles. Achievement tables also show the
existing configurable watched/team milestones and correct-prediction milestones;
these milestones do not introduce extra XP rewards.

Telegram/Instagram links are normalized in the client and constrained in PostgreSQL
to HTTPS public profile URLs on the expected hosts. Empty inputs remove the link.
Links appear in public profiles and open with `noopener noreferrer`.

Validation:

```sh
```

## Fantasy league

Apply `supabase/migrations/20261028001000_fantasy.sql` to an existing database, then rebuild backend and frontend. New installations include this schema in `100-nba-dashboard.sql`; production deployment applies the migration automatically.

Fantasy lives at `/fantasy`. Each authenticated profile may confirm one immutable PG/SG/SF/PF/C lineup per Moscow calendar week. ESPN roster injuries are rechecked on confirmation. Generic G and F positions permit PG/SG and SF/PF respectively. Only teams with scheduled games in the week appear; a selected player must have a future game before Sunday 20:00 Moscow time.

Scoring v1 per completed game: PTS + 1.2 REB + 1.5 AST + 3 STL + 3 BLK − TO − 0.5 missed FG − missed FT + 3 for a win, plus 3 for a double-double or 6 for a triple-double (not both). DNP players earn no win bonus. The total sums player appearances in games starting after confirmation. Fantasy points also award profile XP: after each completed game, the positive sum earned by a profile’s five players becomes XP at 1:1. Negative sums only affect the fantasy ranking. The unique (user_id, kind, game_id) award prevents duplicates; fractional XP is preserved. Apply `20261028002000_fantasy_experience.sql` after the original migration. Existing game snapshots are reconciled automatically.

The backend worker checks every minute and stores each final player box score once, using `(week, game_id, player_id)` to prevent duplicates. The database rejects score writes at or after Sunday 20:00 Moscow time. Results freeze from the snapshots received by that deadline; unfinished/unreceived games and later provider corrections are excluded. This means an upstream outage near the deadline can omit a match. The backend must stay running during the week. No scores are backfilled into closed weeks. Confirmed weeks, including zero-score weeks, remain in the profile. Tied scores share rank.

Checks:

```sh
```

The SQL checks roll back all test records.

The Fantasy catalog reuses `PublicProfileTeamFilter` and only offers teams in that week’s schedule. Player cards open a dialog with current regular-season statistics, games played, a TanStack Charts radar (each axis has an explicit normalization ceiling), links to player profiles, and linked weekly match cards. Fantasy season 1 starts the week of 26 October 2026; the following season starts on the Monday containing 26 October of the following year.

Fantasy season detail ranks are computed across the full ESPN regular-season population with games played, in descending order (also turnovers); equal raw values share competition rank. Shooting percentage ranks require at least one corresponding attempt, without official NBA qualification thresholds. Two-point totals are FG minus 3P, and their accuracy uses those totals. Offensive/defensive rebounds use current-season full athlete totals divided by games played. Since ESPN omits these fields from its compact leaderboard, complete league tables sorted by each rebound metric supply the order. A binary search of full athlete totals finds the first tied position, including large zero-value ties. Incomplete tables or missing comparison values never produce a guessed rank. Season sources are cached for 15 minutes.


## Personal fantasy player levels and bonuses

Apply `supabase/migrations/20261029193000_fantasy_player_bonuses.sql` after the fantasy migrations and rebuild backend/frontend. Fresh database initialization and production deployment include this migration.

Player XP sums positive weekly base results in that profile across positions. Level N begins at `150 * N * (N - 1)` XP. On lineup confirmation the database snapshots each player's level and bonus rate from prior weeks: level 3 = 0.5%, 5 = 1%, 8 = 1.5%, 10+ = 2%. The weekly bonus is `round(min(3, max(0, basePoints) * rate), 1)`, added once to the player's weekly result and both profile leaderboards. Bonuses do not generate player or profile XP. Existing lineups keep zero bonus; past results are unchanged. Game-level breakdowns stay base-only; the player dialog shows the weekly bonus separately. The two information buttons expand scoring and level explanations.


## Profile tabs and social lists

Public profiles group content into overview, fantasy, viewing statistics, games, favorites and saved articles. The selected tab is preserved in the `tab` URL query. Profile settings retain editing/security controls and a separate subscriptions tab.

Signed-in visitors can inspect another profile's subscription and follower counts at `GET /api/profiles/:id/connections`. Add `kind=following` or `kind=followers` and a nonnegative `offset` for a stable 20-person page. Responses contain only profile ID, display name and avatar; account email and notification preferences stay private. The profile header opens an accessible modal with both lists, profile links, pagination, and existing follow/unfollow actions. Counts and lists refresh when a follow action settles.

The local API integration check `node tests/profile-connections.integration.js` runs inside the backend container and creates/removes only its own temporary accounts. No schema migration is needed.

## Persistent match analysis and related game sliders

Apply `supabase/migrations/20261029210000_game_recap_articles.sql`, then rebuild backend and frontend. Fresh initialization and the deployment script include the schema.

`GET /api/game-article/:ESPN_ID` reads `game_recap_articles` first. A completed game with reconciled quarter scores, complete player point totals and team shooting stats produces a deterministic Russian article with sections about periods, shooting, paint/transition/free throws, possessions, player contributions and (when complete play-by-play exists) runs and closing minutes. Plain text, structured article, generator version and source snapshot are inserted once per canonical game ID. Concurrent workers use `ON CONFLICT DO NOTHING` and return the row stored by the database; workers have only SELECT/INSERT privileges. An archived article is readable even if ESPN is temporarily unavailable. Live/incomplete games return 202 and are not archived. Raw source snapshots are private. This analysis uses statistical rules, not an external language model or copied news article.

`GET /api/game-related/:ESPN_ID` provides the last three completed regular/postseason games before that fixture for each team, plus the other fixtures on the same Moscow date. It excludes the reviewed game, deduplicates schedules, checks the team and start time, and can fall back to the previous NBA season near the start of a season. Each group reports its own loading failure so a schedule failure does not hide the same-day games. The overview retains spoiler protection around the article. Both match sliders sit outside the game tabs and remain visible in every section, including before the overview is revealed. Their scores follow the account hideScores preference and default to hidden for guests or while auth loads; the numbers are omitted from rendered text when hidden.


The eye button beside notifications (desktop header and mobile drawer) shows the account-wide score preference and opens a confirmation dialog. Cancel performs no write. Confirm persists `profiles.hide_scores`; failures remain visible in the dialog and allow retry. A global change clears per-game score exceptions, updates match headers/playoffs/calendars/sliders, and locks a previously revealed game overview again when hiding scores. The header indicator reflects the saved preference. Article contents remain a single immutable record and do not depend on the viewer's score preference.


## Daily fantasy (v2)

Apply `20261031120000_daily_fantasy.sql` after earlier migrations, then rebuild backend/frontend. Fresh initialization and production deployment include it. Existing weekly tables, points and lineups remain archived and use scoring v1. Legacy maintenance continues for existing current-week entries; new weekly enrollment is disabled.

Daily tournaments use Moscow calendar dates, including games that finish after midnight. `unlimited` and `balanced` each allow one immutable lineup/user/day with separate daily and cumulative standings. Balanced cap is 410 OVR, enforced in Node and a database trigger that overwrites client ratings/bonuses from the stored slate. All entries lock at the first scheduled tip-off. Days without games cannot be entered; up to 7 days may be selected ahead. Postponed games moved beyond the selected day are excluded. A daily worker retries unfinished slates and waits for complete final player totals; it does not cut off overnight games at midnight. Final snapshots are scored once; later source corrections do not automatically rewrite settled results.

Scoring v2 retains PTS=1 and existing penalties/STL/BLK/DD/TD. PG/SG assists=2 and rebounds=1.2; SF/PF/C assists=1.5 and rebounds=1.5; win=6 for players who actually played. The roster's primary eligible position is frozen per slate, so moving a G-F between lineup slots cannot change coefficients. Generic G => PG/SG, F => SF/PF. Injuries are freshly checked at confirmation.

Statistical OVR v1 is original, not licensed NBA 2K data. The current regular season's league statistics are compared within guard/wing/big roles, using tie-aware percentiles. Weights: per-game PTS .25, MIN .10, Bayesian TS .20, (AST − .8 TO) .20, REB .15, (STL+BLK) .10. TS prior is 50 shooting possessions at .57. The weighted percentile is shrunk toward .5 by season minutes/(minutes+150), mapped with `round(60+39*value)` and clamped 60–99. Players without season games receive neutral provisional 80, rather than a cheap zero rating. Public season source is validated by year/type and completeness. Ratings, primary roles, cap and lineup snapshots are server-owned; a slate is created only before first tip and never retrospectively rated from newer season results. Cache is 15 minutes at the source; the selected slate's snapshot is immutable. Future slates retain the snapshot from their first opening. Live-season sanity check on Oct 31: 430 rated players, range 76–89, consistent with early-season shrinkage.

Personal player XP includes preserved legacy weekly XP and positive daily base results, once per user/player/day across both modes. Legacy-owned overlapping games are excluded from daily player XP. Profile XP is grouped by real game, with each player counted once across modes/legacy (maximum base score during the rules transition). Level bonus tiers remain .5/1/1.5/2 percent at levels 3/5/8/10, capped at 3 points/player/day/mode; bonuses do not generate XP. Future lineups snapshot XP known at confirmation. Public history includes mode labels and legacy entries; levels use authoritative server XP, rather than summing duplicate mode entries.

Verification:
```
./vite-project/node_modules/.bin/vue-tsc -p vite-project/tsconfig.app.json --noEmit --incremental false
```
SQL checks run in a transaction and roll back all fixture data.

`FantasyOvrBadge.vue` puts a keyboard-accessible ⓘ beside OVR on catalog cards and in player details. Its separate modal explains the metric/weights, player-specific percentiles and sample-size adjustment, the balanced cap, and the distinction from personal fantasy XP. Advanced formula is collapsed initially; Escape, backdrop, focus trap and focus restoration are supported.

Live enrollment integration (creates and deletes its own disposable profile):

## Fantasy player tabs, OVR history and profile stats

Apply `20261031140000_fantasy_rating_history.sql`, then rebuild backend/frontend. The player dialog separates Fantasy points/level, season Statistics, OVR history and selected-day Matches. Tabs support arrow/Home/End keys. The OVR help button remains in the header.

`GET /api/fantasy/players/:id/rating-history?season=2027` starts a shared per-season job and returns 202 with progress until the history is ready. The job reads ESPN's season calendar, filters completed regular-season events and saves complete, reconciled boxscores in `fantasy_rating_games`. Snapshots grant the service SELECT/INSERT only (including explicit revocation of inherited default privileges); clients have no direct table access. Missing/incomplete games fail closed and may be retried. Requests for the same season share a job; saved games survive backend restarts. Refresh is on demand after 15 minutes; existing game snapshots are not overwritten. Supported season years start at 2026.

The OVR graph is explicitly a retrospective reconstruction, not a record of values previously shown by the site. Before each target-player point it accumulates all league boxscores in start-time order (simultaneous starts grouped), then uses the same OVR formula and current season position directory. It never compares old individual totals to future league production. A point appears only after an actual played game; DNP is excluded. Source corrections, position metadata and the slate snapshot time may explain differences from the frozen tournament rating. A live check reconstructed 81 games for 2026–27 and Maxey's six OVR points: 83,85,86,86,87,88.

`GET /api/fantasy/profiles/:id` uses the server-only `read_fantasy_profile(uuid)` RPC. It returns mode-tagged public lineup history, shared player XP, and complete cumulative ranks per mode (including profiles outside the top 100). Profile tabs independently show unlimited, balanced and legacy weekly data. Completed-tournament averages/best/wins use settled results; in-progress totals remain visible separately. Level bonus totals are included. The profile calendar filters only the history list, not the summary statistics or all-time best players.

The team filter now supports logos, search, keyboard navigation, Escape and outside click. The fantasy calendar uses Moscow date keys, Monday-start grids and separate blue/violet dots for confirmed unlimited/balanced lineups. The same calendar is used in the main fantasy picker and profile history. Legacy weekly dates are kept in their separate archive rather than marked as daily slates.

Checks:
```
./vite-project/node_modules/.bin/vue-tsc -p vite-project/tsconfig.app.json --noEmit --incremental false
```
The SQL fixtures roll back. No persistent test account is needed.

Apply `20261031150000_balanced_ovr_410.sql` after the history migration to increase the balanced lineup cap to 410. The Node validator, UI budget/rules/help and DB trigger all use 410. Existing confirmed lineups and frozen player OVR are preserved. Exactly 410 is valid; 411 is rejected in balanced mode. Unlimited mode is unaffected.

## Notification center and preferences

Apply `20261031180000_notification_center.sql`, then rebuild backend/frontend. This supersedes the old separate bell feeds and the best-effort Node social fanout. Existing legacy notifications/read states are imported with stable event keys; a durable import cutoff prevents future deployments from replaying newer legacy-table writes. No historical activity is replayed.

The bell uses authenticated `/api/profile-inbox`, `/read`, `/clear` and `/settings` routes. The gear opens per-account settings for activity (game comments, published articles, article comments; all followed people or a selected list), daily fantasy and match results (favorites, favorite teams, predictions). The existing profile `notify_followed_comments` switch remains the activity master switch, so older profile settings still apply. Fantasy/results default off until opted in; activation timestamps prevent retroactive result spam. Selected actors are intersected with current follows and generation always rechecks the follow relationship. Turning categories off stops new events, preserving old inbox history.

Social notifications are created atomically by database triggers, including writes through direct Supabase APIs. Fantasy triggers cover confirmation, complete-game score batches (transition tables restrict work to changed games), and settled day results. A unique recipient/event key prevents retries from generating duplicates. Favorite/team/prediction match discovery queues durable game watches; a one-minute Node worker retries pending status reads, publishes final non-tied scores, and finishes the watch atomically with delivery. Favorite-team discovery scans up to 14 days back after downtime; previously queued watches have no such cutoff. Modern canonical ESPN favorites and current prediction polls are supported. The worker only queues games from teams actually selected by enabled subscribers. No browser push or email delivery is added.

Inbox reads remove score, winner, fantasy points and rank fields on the server when the profile hides scores. The client also respects the current hide-scores preference, including stale cached payloads. Article titles/excerpts are not included in notification previews. Only display names/avatars are returned for actors/follows. Settings and inbox data have no direct anon/authenticated table access; the trusted API scopes every mutation/read to the validated session. `X-Profile-Id` binds requests to the account that opened the UI, rejecting account-switch races. Read/clear-all operations use the inbox snapshot timestamp so newly arrived events are preserved. Clear sets `dismissed_at`; it does not delete stored notifications. Loading/errors are visible, unlike the old empty-feed fallback.

Checks:
```
./vite-project/node_modules/.bin/vue-tsc -p vite-project/tsconfig.app.json --noEmit --incremental false
```
SQL tests roll back all fixtures, including generated events. A live request without a session returns 401. Visual verification in the signed-in Chrome account was not performed because computer-use access to Chrome was not approved; no real account preferences were changed during verification.

## Fantasy catalog controls

Apply `20261031190000_fantasy_popularity.sql` and rebuild backend/frontend. The catalog has a compact sticky lineup/filter dock bounded by the player catalog, with a mobile filter disclosure and a shortcut back to the full lineup confirmation. The desktop dock adjusts its offset when the site header hides. Position cards show the selected player and OVR while scrolling.

Sort options use a custom accessible listbox, including popularity. `fantasy_popularity(date,text)` returns only anonymous counts/sample size for confirmed lineups in the selected mode. When at least one lineup exists for that day, that day's counts are used; otherwise the inclusive last 30 calendar days ending on the selected day are used. The period/sample are labelled; a zero sample is not represented as actual popularity. Ties use OVR descending, then player name. An index supports the day/mode aggregation.

The balanced-only optional OVR filter excludes candidates that cannot complete the five-player lineup within the cap. Replacing an active slot returns its current OVR first. The reserve uses distinct, available future-game players from all catalog teams (independent of the visible search/team filters), solving a minimum-cost assignment to open positions; it does not reserve the same multi-position player twice. It displays the highest OVR among actually feasible candidates. Server validation remains authoritative and the cap stays 410.

One-off project verification files were removed at the user’s request after validation. Checks covered popularity per mode/day, the 30-day fallback, 410/411 OVR, replacement budget, distinct-player reserves, desktop/mobile sticky positioning and dropdown interactions. The frontend builder now caps Node heap at 768 MB by default (`BUILD_NODE_OPTIONS`) to fit the local 4 GB Docker VM.
