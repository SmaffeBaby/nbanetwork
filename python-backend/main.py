from fastapi import FastAPI, HTTPException
from upcoming_games import select_upcoming_games
import json
import re
import threading
import time
from difflib import SequenceMatcher
from urllib.request import Request, urlopen
from nba_api.stats.endpoints import leaguestandings
from nba_api.stats.endpoints import leaguedashplayerstats, playergamelog
from nba_api.stats.endpoints import playercareerstats
from nba_api.stats.static import players as static_players
from calendar_service import CalendarProvider

calendar_provider = CalendarProvider()
from nba_api.stats.endpoints import teamgamelog
from nba_api.stats.endpoints import scoreboardv2
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from nba_api.stats.endpoints import boxscoremiscv3, boxscoresummaryv2, boxscoretraditionalv2
from nba_api.stats.endpoints import boxscoretraditionalv3
from nba_api.stats.endpoints import playbyplayv3
from nba_api.stats.endpoints import leaguegamelog

app = FastAPI()
MSK_TZ = ZoneInfo("Europe/Moscow")
ET_TZ = ZoneInfo("America/New_York")
SCHEDULE_URLS = [
    "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json",
    "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json",
]
NBA_CDN_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://www.nba.com",
}
STATIC_SCOREBOARD_CACHE = {}
SCHEDULE_GAME_CACHE = None
SCHEDULE_GAME_CACHE_TTL_SECONDS = 60
GAMES_BY_DATE_CACHE_TTL_SECONDS = 5 * 60
GAMES_BY_DATE_CACHE_MAX_SIZE = 256
GAMES_BY_DATE_MIN_DATE = datetime(2000, 1, 1).date()
GAMES_BY_DATE_MAX_FUTURE_DAYS = 370
GAMES_BY_DATE_FETCH_SEMAPHORE = threading.BoundedSemaphore(2)
GAMES_BY_DATE_CACHE = {}
GAMES_BY_DATE_CACHE_LOCK = threading.Lock()
SCHEDULE_GAME_CACHE_LOCK = threading.Lock()
SCHEDULE_FETCH_LOCK = threading.Lock()
CYRILLIC_TO_LATIN = str.maketrans({
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
})
PLAYER_QUERY_ALIASES = {
    "tyrise hailybirton": "tyrese haliburton",
    "tyrese hailybirton": "tyrese haliburton",
    "tyris haliburton": "tyrese haliburton",
    "micael jordan": "michael jordan",
    "mikel jordan": "michael jordan",
    "kobe brayant": "kobe bryant",
    "kobi bryant": "kobe bryant",
    "shakil o nil": "shaquille o neal",
    "shakil onil": "shaquille o neal",
    "shaquil oneal": "shaquille o neal",
    "shaq": "shaquille o neal",
}

def normalize_player_query(value: str):
    value = (value or "").lower().translate(CYRILLIC_TO_LATIN)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return PLAYER_QUERY_ALIASES.get(value, value)

def player_match_score(query: str, name: str):
    normalized_name = normalize_player_query(name)

    if not query:
        return 0

    if normalized_name == query:
        return 120

    if query in normalized_name:
        return 100 - normalized_name.index(query)

    query_tokens = query.split()
    name_tokens = normalized_name.split()

    if query_tokens and all(
        any(name_token.startswith(query_token) for name_token in name_tokens)
        for query_token in query_tokens
    ):
        return 88

    return int(SequenceMatcher(None, query, normalized_name).ratio() * 80)

def get_current_nba_season():
    now = datetime.now()
    year = now.year

    if now.month >= 10:
        return f"{year}-{str(year + 1)[-2:]}"
    else:
        return f"{year - 1}-{str(year)[-2:]}"

def parse_utc_datetime(value):
    if not value:
        return None

    normalized = str(value).strip()
    if normalized.startswith("1900-01-01"):
        return None

    try:
        parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None

def to_utc_iso(value):
    parsed = parse_utc_datetime(value)
    if not parsed:
        return None

    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

def parse_date_value(value, fallback_date=None):
    if not value:
        return fallback_date

    normalized = str(value).strip()
    if normalized.startswith("1900-01-01"):
        return fallback_date

    try:
        return datetime.fromisoformat(normalized[:10]).date()
    except ValueError:
        return fallback_date

def parse_et_tipoff(game_date, *time_values):
    date_part = parse_date_value(game_date)
    if not date_part:
        return None

    for value in time_values:
        match = re.search(r"(\d{1,2}):(\d{2})\s*(am|pm)", str(value or ""), re.I)
        if not match:
            continue

        hours = int(match.group(1))
        minutes = int(match.group(2))
        ampm = match.group(3).lower()

        if ampm == "pm" and hours != 12:
            hours += 12
        if ampm == "am" and hours == 12:
            hours = 0

        tipoff_et = datetime(
            date_part.year,
            date_part.month,
            date_part.day,
            hours,
            minutes,
            tzinfo=ET_TZ
        )

        return tipoff_et.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

    return None

def get_scheduled_game_time_utc(game, fallback_date=None):
    for key in ["gameTimeUTC", "gameDateTimeUTC"]:
        value = to_utc_iso(game.get(key))
        if value:
            return value

    game_date_est = (
        game.get("gameDateEst")
        or game.get("gameDate")
        or (fallback_date.isoformat() if fallback_date else None)
    )

    et_tipoff = parse_et_tipoff(
        game_date_est,
        game.get("gameTimeEst"),
        game.get("gameStatusText"),
        game.get("gameStatusTextLong")
    )
    if et_tipoff:
        return et_tipoff

    # gameDateUTC from NBA schedule/static data is often only a calendar date.
    # Use it only when it contains a meaningful non-midnight time.
    game_date_utc = parse_utc_datetime(game.get("gameDateUTC"))
    if game_date_utc and (game_date_utc.hour or game_date_utc.minute):
        return game_date_utc.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

    return None

def get_msk_date(value, fallback_date=None):
    parsed = parse_utc_datetime(value)
    if parsed:
        return parsed.astimezone(MSK_TZ).date()

    if fallback_date:
        return fallback_date

    return None

def normalize_scheduled_game(game, fallback_date=None):
    if not game:
        return None

    game_id = game.get("gameId")
    home = game.get("homeTeam", {}) or {}
    away = game.get("awayTeam", {}) or {}

    if not game_id or not home.get("teamId") or not away.get("teamId"):
        return None

    game_time_utc = get_scheduled_game_time_utc(game, fallback_date)
    game_date_est = (
        game.get("gameDateEst")
        or game.get("gameDate")
        or game.get("gameDateUTC")
        or (fallback_date.isoformat() if fallback_date else "")
    )
    if str(game_date_est).strip().startswith("1900-01-01"):
        game_date_est = fallback_date.isoformat() if fallback_date else ""

    game_msk_date = get_msk_date(game_time_utc, fallback_date)

    return {
        "GAME_ID": game_id,
        "GAME_DATE_EST": game_date_est,
        "GAME_DATE_MSK": game_msk_date.isoformat() if game_msk_date else str(game_date_est)[:10],
        "GAME_TIME_UTC": game_time_utc,
        "HOME_TEAM_ID": home.get("teamId"),
        "VISITOR_TEAM_ID": away.get("teamId"),
        "HOME_TEAM_ABBREVIATION": home.get("teamTricode") or home.get("teamAbbreviation"),
        "VISITOR_TEAM_ABBREVIATION": away.get("teamTricode") or away.get("teamAbbreviation"),
        "HOME_TEAM_SCORE": home.get("score"),
        "VISITOR_TEAM_SCORE": away.get("score"),
        "GAME_STATUS": game.get("gameStatusText") or game.get("gameStatusTextLong") or game.get("gameStatus") or "TBD",
        "GAME_STATUS_ID": game.get("gameStatus"),
    }

def normalize_live_boxscore_game(game_id, game):
    if not game:
        return None

    home = game.get("homeTeam", {}) or {}
    away = game.get("awayTeam", {}) or {}

    if not home.get("teamId") or not away.get("teamId"):
        return None

    game_time_utc = to_utc_iso(game.get("gameTimeUTC"))
    game_date_msk = get_msk_date(game_time_utc)

    return {
        "GAME_ID": game.get("gameId") or game_id,
        "GAME_DATE_EST": game.get("gameEt") or game.get("gameTimeLocal") or game.get("gameTimeUTC") or "",
        "GAME_DATE_MSK": game_date_msk.isoformat() if game_date_msk else "",
        "GAME_TIME_UTC": game_time_utc,
        "HOME_TEAM_ID": home.get("teamId"),
        "VISITOR_TEAM_ID": away.get("teamId"),
        "HOME_TEAM_ABBREVIATION": home.get("teamTricode") or home.get("teamAbbreviation"),
        "VISITOR_TEAM_ABBREVIATION": away.get("teamTricode") or away.get("teamAbbreviation"),
        "HOME_TEAM_SCORE": home.get("score"),
        "VISITOR_TEAM_SCORE": away.get("score"),
        "GAME_STATUS": game.get("gameStatusText") or game.get("gameStatus") or "TBD",
    }

def fetch_live_boxscore_metadata(game_id):
    url = f"https://cdn.nba.com/static/json/liveData/boxscore/boxscore_{game_id}.json"
    request = Request(url, headers=NBA_CDN_HEADERS)

    with urlopen(request, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))

    return normalize_live_boxscore_game(game_id, payload.get("game", {}) or {})

def fetch_static_scoreboard(nba_date):
    cached = STATIC_SCOREBOARD_CACHE.get(nba_date)
    if cached is not None:
        return cached

    date_key = nba_date.strftime("%Y%m%d")
    url = f"https://cdn.nba.com/static/json/staticData/scores/scores_{date_key}.json"
    request = Request(url, headers=NBA_CDN_HEADERS)

    with urlopen(request, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))

    games = payload.get("scoreboard", {}).get("games", [])
    games_by_id = {
        game.get("gameId"): game
        for game in games
        if game.get("gameId")
    }
    STATIC_SCOREBOARD_CACHE[nba_date] = games_by_id

    return games_by_id

def fetch_schedule_games_by_id():
    with SCHEDULE_FETCH_LOCK:
        return _fetch_schedule_games_by_id()

def _fetch_schedule_games_by_id():
    global SCHEDULE_GAME_CACHE

    now = time.time()

    with SCHEDULE_GAME_CACHE_LOCK:
        if (
            SCHEDULE_GAME_CACHE is not None
            and now - SCHEDULE_GAME_CACHE.get("fetched_at", 0) < SCHEDULE_GAME_CACHE_TTL_SECONDS
        ):
            return SCHEDULE_GAME_CACHE["games_by_id"]

    games_by_id = {}

    for url in SCHEDULE_URLS:
        try:
            request = Request(url, headers=NBA_CDN_HEADERS)

            with urlopen(request, timeout=4) as response:
                schedule = json.loads(response.read().decode("utf-8"))

            for game_date_entry in schedule.get("leagueSchedule", {}).get("gameDates", []):
                fallback_date = None
                raw_date = game_date_entry.get("gameDate")

                if raw_date:
                    try:
                        fallback_date = datetime.fromisoformat(str(raw_date)[:10]).date()
                    except ValueError:
                        fallback_date = None

                for game in game_date_entry.get("games", []):
                    normalized = normalize_scheduled_game(game, fallback_date)
                    if normalized:
                        games_by_id[normalized["GAME_ID"]] = normalized

            if games_by_id:
                with SCHEDULE_GAME_CACHE_LOCK:
                    SCHEDULE_GAME_CACHE = {
                        "fetched_at": now,
                        "games_by_id": games_by_id,
                    }
                return games_by_id
        except Exception as e:
            print(f"Failed to fetch NBA schedule from {url}: {e}")

    with SCHEDULE_GAME_CACHE_LOCK:
        SCHEDULE_GAME_CACHE = {
            "fetched_at": now,
            "games_by_id": games_by_id,
        }
    return games_by_id

def parse_games_by_date_param(date_value):
    try:
        target_date = datetime.strptime(date_value, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date")

    if target_date.isoformat() != date_value:
        raise HTTPException(status_code=400, detail="Invalid date")

    max_date = datetime.now(MSK_TZ).date() + timedelta(days=GAMES_BY_DATE_MAX_FUTURE_DAYS)
    if target_date < GAMES_BY_DATE_MIN_DATE or target_date > max_date:
        raise HTTPException(status_code=400, detail="Date out of allowed range")

    return target_date

def get_cached_games_by_date(date_key):
    now = time.time()

    with GAMES_BY_DATE_CACHE_LOCK:
        cached = GAMES_BY_DATE_CACHE.get(date_key)
        if cached and now - cached["fetched_at"] < (30 if date_key >= (datetime.now(MSK_TZ).date() - timedelta(days=1)).isoformat() else 3600):
            return cached["payload"]

    return None

def cache_games_by_date(date_key, payload):
    games = list(payload) if isinstance(payload, list) else []

    with GAMES_BY_DATE_CACHE_LOCK:
        GAMES_BY_DATE_CACHE[date_key] = {
            "fetched_at": time.time(),
            "payload": games,
        }

        if len(GAMES_BY_DATE_CACHE) > GAMES_BY_DATE_CACHE_MAX_SIZE:
            oldest_key = min(
                GAMES_BY_DATE_CACHE,
                key=lambda key: GAMES_BY_DATE_CACHE[key]["fetched_at"]
            )
            GAMES_BY_DATE_CACHE.pop(oldest_key, None)

    return games

def find_scheduled_game(game_id):
    try:
        live_game = fetch_live_boxscore_metadata(game_id)
        if live_game:
            return live_game
    except Exception as e:
        print(f"Failed to fetch NBA live boxscore metadata for {game_id}: {e}")

    try:
        scheduled = fetch_schedule_games_by_id().get(game_id)
        if scheduled:
            return scheduled
    except Exception as e:
        print(f"Failed to find NBA schedule game {game_id}: {e}")

    today = datetime.now(MSK_TZ).date()

    for offset in range(-3, 15):
        nba_date = today + timedelta(days=offset)

        try:
            static_game = fetch_static_scoreboard(nba_date).get(game_id)
            normalized = normalize_scheduled_game(static_game, nba_date)
            if normalized:
                return normalized
        except Exception as e:
            print(f"Failed to fetch NBA static scoreboard for {nba_date}: {e}")

    return None

def get_completed_game_time_utc(game_id, fallback_date=None):
    try:
        live_game = fetch_live_boxscore_metadata(game_id)
        if live_game and live_game.get("GAME_TIME_UTC"):
            return live_game.get("GAME_TIME_UTC")
    except Exception as e:
        print(f"Failed to fetch NBA live boxscore metadata for {game_id}: {e}")

    try:
        summary = boxscoresummaryv2.BoxScoreSummaryV2(game_id=game_id).get_dict()
        game_summary = next(
            (result_set for result_set in summary.get("resultSets", []) if result_set.get("name") == "GameSummary"),
            None
        )

        if game_summary and game_summary.get("rowSet"):
            row = dict(zip(game_summary.get("headers", []), game_summary["rowSet"][0]))
            scheduled_time = get_scheduled_game_time_utc({
                "gameId": game_id,
                "gameDateEst": row.get("GAME_DATE_EST"),
                "gameStatusText": row.get("GAME_STATUS_TEXT"),
            }, fallback_date)
            if scheduled_time:
                return scheduled_time
    except Exception as e:
        print(f"Failed to fetch NBA completed game time for {game_id}: {e}")

    return None

@app.get("/current-season")
def current_season():
    return {
        "season": get_current_nba_season()
    }

@app.get("/players/search")
def search_players(q: str = ""):
    query = normalize_player_query(q)

    if len(query) < 2:
        return {"data": []}

    matches = []

    for player in static_players.get_players():
        name = player.get("full_name", "")
        score = player_match_score(query, name)

        if score < 54:
            continue

        matches.append({
            "PLAYER_ID": player.get("id"),
            "PLAYER_NAME": name,
            "TEAM_ABBREVIATION": "NBA" if player.get("is_active") else "LEGEND",
            "IS_ACTIVE": player.get("is_active", False),
            "_score": score,
        })

    matches.sort(key=lambda player: (player["_score"], player["IS_ACTIVE"]), reverse=True)

    return {
        "data": [
            {key: value for key, value in player.items() if key != "_score"}
            for player in matches[:12]
        ]
    }

@app.get("/standings/{season}")
def get_standings(season: str):
    data = leaguestandings.LeagueStandings(season=season)
    return data.get_dict()

@app.get("/player-stats/{season}")
def get_regular(season: str):
    return leaguedashplayerstats.LeagueDashPlayerStats(
        season=season,
        season_type_all_star="Regular Season",
        per_mode_detailed="PerGame",
        measure_type_detailed_defense="Base",
        timeout=60
    ).get_dict()


@app.get("/player-stats/playoffs/{season}")
def get_playoffs(season: str):
    return leaguedashplayerstats.LeagueDashPlayerStats(
        season=season,
        season_type_all_star="Playoffs",
        per_mode_detailed="PerGame",
        measure_type_detailed_defense="Base",
        timeout=60
    ).get_dict()


@app.get("/player-stats/all/{season}")
def get_all(season: str):
    reg = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season,
        season_type_all_star="Regular Season",
        per_mode_detailed="PerGame",
        measure_type_detailed_defense="Base",
        timeout=60
    ).get_dict()

    po = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season,
        season_type_all_star="Playoffs",
        per_mode_detailed="PerGame",
        measure_type_detailed_defense="Base",
        timeout=60
    ).get_dict()

    reg_rows = reg["resultSets"][0]["rowSet"]
    po_rows = po["resultSets"][0]["rowSet"]

    reg["resultSets"][0]["rowSet"] = reg_rows + po_rows

    return reg

@app.get("/player-career/{player_name}")
def get_player_career(player_name: str):
    try:
        matches = static_players.find_players_by_full_name(player_name)
        exact_match = next(
            (player for player in matches if player.get("full_name", "").lower() == player_name.lower()),
            None
        )
        player = exact_match or (matches[0] if matches else None)

        if not player:
            return {"error": "Player not found"}

        data = playercareerstats.PlayerCareerStats(
            player_id=player["id"],
            timeout=60
        ).get_dict()

        regular = next(
            (
                result_set for result_set in data.get("resultSets", [])
                if result_set.get("name") == "SeasonTotalsRegularSeason"
            ),
            None
        )

        if not regular:
            return {
                "player": {
                    "PLAYER_ID": player["id"],
                    "PLAYER_NAME": player["full_name"],
                    "TEAM_ABBREVIATION": "",
                },
                "seasons": [],
                "careerTeams": [],
                "resultSets": data.get("resultSets", [])
            }

        headers = regular.get("headers", [])
        rows = regular.get("rowSet", [])
        season_index = headers.index("SEASON_ID")
        team_index = headers.index("TEAM_ABBREVIATION")

        seasons = sorted(
            {row[season_index] for row in rows if row[season_index]},
            key=lambda season: int(str(season).split("-")[0]),
            reverse=True
        )

        seasons_ascending = list(reversed(seasons))
        career_teams = []

        def season_end_year(season):
            start_year = int(str(season).split("-")[0])
            return start_year + 1

        for season in seasons_ascending:
            teams = []
            for row in rows:
                if row[season_index] != season:
                    continue

                team = row[team_index]
                if team and team != "TOT" and team not in teams:
                    teams.append(team)

            if not teams:
                for row in rows:
                    if row[season_index] == season and row[team_index] and row[team_index] not in teams:
                        teams.append(row[team_index])

            team_label = " / ".join(teams)
            if not team_label:
                continue

            if career_teams and career_teams[-1]["team"] == team_label:
                career_teams[-1]["endSeason"] = season
                career_teams[-1]["endYear"] = season_end_year(season)
            else:
                career_teams.append({
                    "team": team_label,
                    "startSeason": season,
                    "endSeason": season,
                    "startYear": int(str(season).split("-")[0]),
                    "endYear": season_end_year(season),
                })

        last_team = career_teams[-1]["team"].split(" / ")[-1] if career_teams else ""

        return {
            "player": {
                "PLAYER_ID": player["id"],
                "PLAYER_NAME": player["full_name"],
                "TEAM_ABBREVIATION": last_team,
            },
            "seasons": seasons,
            "careerTeams": list(reversed(career_teams)),
            "resultSets": data.get("resultSets", [])
        }

    except Exception as e:
        return {"error": str(e)}

@app.get("/player-gamelog/{player_id}/{season}")
def get_player_gamelog(player_id: int, season: str):
    try:
        regular = playergamelog.PlayerGameLog(
            player_id=player_id,
            season=season,
            season_type_all_star="Regular Season"
        ).get_dict()

        playoffs = playergamelog.PlayerGameLog(
            player_id=player_id,
            season=season,
            season_type_all_star="Playoffs"
        ).get_dict()

        reg_rows = regular["resultSets"][0]["rowSet"]
        po_rows = playoffs["resultSets"][0]["rowSet"]

        for row in po_rows:
            row.append("Playoffs")

        for row in reg_rows:
            row.append("Regular")

        regular["resultSets"][0]["headers"].append("SEASON_TYPE")

        combined = reg_rows + po_rows
        regular["resultSets"][0]["rowSet"] = combined

        return regular

    except Exception as e:
        return {"error": str(e)}

@app.get("/team-games/{team_id}/{season}")
def get_team_games(team_id: int, season: str, season_type: str = "all"):
    try:

        def fetch(season_type_value):
            result = teamgamelog.TeamGameLog(
                team_id=team_id,
                season=season,
                season_type_all_star=season_type_value
            ).get_dict()["resultSets"][0]

            for row in result["rowSet"]:
                row.append(season_type_value)

            result["headers"].append("SEASON_TYPE")

            return result

        if season_type == "all":
            regular = fetch("Regular Season")
            playoffs = fetch("Playoffs")

            return {
                "headers": regular["headers"],
                "rowSet": regular["rowSet"] + playoffs["rowSet"]
            }

        elif season_type == "playoffs":
            return fetch("Playoffs")

        elif season_type == "regular":
            return fetch("Regular Season")

        else:
            return {"error": "Invalid season_type"}

    except Exception as e:
        return {"error": str(e)}

@app.get("/team-upcoming-games/{team_id}")
def get_team_upcoming_games(team_id: int):
    now = datetime.now(timezone.utc)
    scheduled = fetch_schedule_games_by_id()
    if scheduled:
        games = list(scheduled.values())
    else:
        try:
            games = calendar_provider.team_games(team_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Schedule source unavailable") from exc

    upcoming = []
    for game in games:
        if team_id not in (game["HOME_TEAM_ID"], game["VISITOR_TEAM_ID"]):
            continue
        tipoff = parse_utc_datetime(game.get("GAME_TIME_UTC"))
        if not tipoff or tipoff <= now or game.get("GAME_STATUS_ID") in (2, 3):
            continue
        upcoming.append([
            game["GAME_ID"], game["GAME_TIME_UTC"],
            f'{game["VISITOR_TEAM_ABBREVIATION"]} @ {game["HOME_TEAM_ABBREVIATION"]}',
            tipoff.astimezone(MSK_TZ).strftime("%H:%M"),
        ])
    upcoming.sort(key=lambda row: row[1])
    return {"resultSets": [{
        "headers": ["GAME_ID", "GAME_DATE", "MATCHUP", "GAME_TIME"],
        "rowSet": upcoming,
    }]}

@app.get("/game-detail/{game_id}")
def get_game_detail(game_id: str):
    metadata = find_scheduled_game(game_id)

    try:
        summary = boxscoresummaryv2.BoxScoreSummaryV2(game_id=game_id)
        boxscore = boxscoretraditionalv2.BoxScoreTraditionalV2(game_id=game_id)

        summary_dict = summary.get_dict()
        boxscore_dict = boxscore.get_dict()

        try:
            misc_dict = data_frames_to_result_sets(
                boxscoremiscv3.BoxScoreMiscV3(game_id=game_id).get_data_frames(),
                ["PlayerStats", "TeamStats"]
            )
        except Exception as e:
            print(f"Failed to fetch BoxScoreMiscV3 for {game_id}: {e}")
            misc_dict = {"resultSets": []}

        try:
            play_by_play_dict = data_frames_to_result_sets(
                playbyplayv3.PlayByPlayV3(game_id=game_id).get_data_frames(),
                ["PlayByPlay", "AvailableVideo"]
            )
        except Exception as e:
            print(f"Failed to fetch PlayByPlayV3 for {game_id}: {e}")
            play_by_play_dict = {"resultSets": []}

        return {
            "game_id": game_id,
            "metadata": metadata,
            "summary": summary_dict,
            "boxscore": boxscore_dict,
            "misc": misc_dict,
            "playByPlay": play_by_play_dict
        }

    except Exception as e:
        if metadata:
            return {
                "game_id": game_id,
                "metadata": metadata,
                "summary": {"resultSets": []},
                "boxscore": {"resultSets": []},
                "misc": {"resultSets": []},
                "playByPlay": {"resultSets": []}
            }

        return {"error": str(e)}


def data_frames_to_result_sets(data_frames, names):
    result_sets = []

    for index, frame in enumerate(data_frames):
        payload = json.loads(frame.to_json(orient="split"))
        result_sets.append({
            "name": names[index] if index < len(names) else f"ResultSet{index + 1}",
            "headers": payload.get("columns", []),
            "rowSet": payload.get("data", [])
        })

    return {"resultSets": result_sets}


@app.get("/games/upcoming")
def get_upcoming_games():
    now = datetime.now(timezone.utc)
    scheduled = fetch_schedule_games_by_id()
    games = select_upcoming_games(scheduled.values(), now)
    if games:
        return games
    # When the NBA schedule is unavailable or belongs to an older season,
    # use the existing calendar fallback, stopping as soon as the list is full.
    candidates = []
    today = now.astimezone(MSK_TZ).date()
    try:
        for offset in range(-1, 15):
            candidates.extend(calendar_provider.games_on_date(today + timedelta(days=offset)))
            games = select_upcoming_games(candidates, now)
            if len(games) >= 6:
                break
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Upcoming games source unavailable") from exc
    return games


@app.get("/games/by-date/{date}")
def get_games_by_date(date: str):
    target_msk_date = parse_games_by_date_param(date)
    cached_games = get_cached_games_by_date(date)
    if cached_games is not None:
        return cached_games

    if not GAMES_BY_DATE_FETCH_SEMAPHORE.acquire(timeout=15):
        raise HTTPException(
            status_code=503,
            detail="Games by date fetch is busy. Please retry shortly.",
            headers={"Retry-After": "5"},
        )

    try:
        cached_games = get_cached_games_by_date(date)
        if cached_games is not None:
            return cached_games

        return fetch_games_by_date_uncached(date, target_msk_date)
    finally:
        GAMES_BY_DATE_FETCH_SEMAPHORE.release()

def fetch_games_by_date_uncached(date, target_msk_date):
    scheduled = fetch_schedule_games_by_id()
    games = [game for game in scheduled.values() if game.get("GAME_DATE_MSK") == date]
    # The schedule can cover a different season. Never mistake that for an empty day.
    covered = [game.get("GAME_DATE_MSK", "") for game in scheduled.values()]
    if covered and min(covered) <= date <= max(covered):
        return cache_games_by_date(date, games)
    try:
        games = calendar_provider.games_on_date(target_msk_date)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Games source unavailable. Please retry.") from exc
    return cache_games_by_date(date, games)

@app.get("/game-boxscore-v3/{game_id}/quarter/{quarter}")
def get_game_boxscore_quarter(game_id: str, quarter: int):
    return get_game_boxscore_range(game_id, quarter, quarter)


@app.get("/game-boxscore-v3/{game_id}/range/{start_period}/{end_period}")
def get_game_boxscore_range(game_id: str, start_period: int, end_period: int):
    try:
        data = boxscoretraditionalv3.BoxScoreTraditionalV3(
            game_id=game_id,
            range_type=1,
            start_period=start_period,
            end_period=end_period,
            start_range=0,
            end_range=28800
        )

        return data.get_dict()

    except Exception as e:
        return {"error": str(e)}


from collections import defaultdict


@app.get("/playoffs/{season}")
def get_playoff_games(season: str):
    try:
        data = leaguegamelog.LeagueGameLog(
            season=season,
            season_type_all_star="Playoffs"
        ).get_dict()

        result_set = data["resultSets"][0]

        headers = result_set["headers"]
        rows = result_set["rowSet"]

        games = []

        for row in rows:
            game = dict(zip(headers, row))

            games.append({
                "GAME_ID": game.get("GAME_ID"),
                "GAME_DATE": game.get("GAME_DATE"),
                "MATCHUP": game.get("MATCHUP"),
                "WL": game.get("WL"),
                "PTS": game.get("PTS"),
                "REB": game.get("REB"),
                "AST": game.get("AST"),
                "SEASON_TYPE": "Playoffs",
                "HOME_TEAM_ABBR": game.get("MATCHUP", "").split(" vs ")[0],
                "AWAY_TEAM_ABBR": game.get("MATCHUP", "").split(" vs ")[-1],
            })

        return {
            "season": season,
            "count": len(games),
            "games": games
        }

    except Exception as e:
        return {"error": str(e)}
