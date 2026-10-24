"""ESPN fallback for calendar data when the NBA schedule is unavailable.

Provider IDs are namespaced: they must never be passed to NBA boxscore APIs.
All timestamps are UTC; grouping into calendar days is explicitly Moscow time.
"""
from concurrent.futures import Future, ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo
import json
import threading
import time

from nba_api.stats.static import teams

MSK = ZoneInfo("Europe/Moscow")
BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
NBA_TEAMS = {team["abbreviation"]: team["id"] for team in teams.get_teams()}
ALIASES = {"NY": "NYK", "GS": "GSW", "SA": "SAS", "NO": "NOP", "UTAH": "UTA", "WSH": "WAS"}


class CalendarProvider:
    def __init__(self):
        self.cache = {}
        self.pending = {}
        self.lock = threading.Lock()

    def _get(self, path, ttl=30):
        with self.lock:
            cached = self.cache.get(path)
            if cached and time.monotonic() < cached[0]:
                return cached[1]
            pending = self.pending.get(path)
            owner = pending is None
            if owner:
                pending = self.pending[path] = Future()
        if not owner:
            return pending.result(timeout=12)
        try:
            request = Request(f"{BASE}/{path}", headers={"User-Agent": "NBA-dashboard/1.0", "Accept": "application/json"})
            with urlopen(request, timeout=8) as response:
                data = json.load(response)
            if not isinstance(data.get("events"), list):
                raise ValueError("Invalid schedule response")
            with self.lock:
                self.cache[path] = (time.monotonic() + ttl, data)
                if len(self.cache) > 256:
                    self.cache.pop(next(iter(self.cache)))
            pending.set_result(data)
            return data
        except Exception as exc:
            pending.set_exception(exc)
            raise
        finally:
            with self.lock:
                self.pending.pop(path, None)

    @staticmethod
    def normalize(event):
        competition = event.get("competitions", [{}])[0]
        competitors = competition.get("competitors", [])
        home = next((x for x in competitors if x.get("homeAway") == "home"), None)
        away = next((x for x in competitors if x.get("homeAway") == "away"), None)
        if not home or not away:
            return None
        home_abbr = home["team"]["abbreviation"]
        away_abbr = away["team"]["abbreviation"]
        home_abbr = ALIASES.get(home_abbr, home_abbr)
        away_abbr = ALIASES.get(away_abbr, away_abbr)
        if home_abbr not in NBA_TEAMS or away_abbr not in NBA_TEAMS:
            return None
        tipoff = datetime.fromisoformat(event["date"].replace("Z", "+00:00"))
        status = (competition.get("status") or event.get("status") or {}).get("type", {})
        state = status.get("state", "pre")
        def score(team):
            value = team.get("score")
            if isinstance(value, dict):
                value = value.get("value", value.get("displayValue"))
            return int(float(value)) if value not in (None, "") and state != "pre" else None
        return {
            "GAME_ID": f'espn:{event["id"]}',
            "GAME_DATE_EST": tipoff.astimezone(ZoneInfo("America/New_York")).date().isoformat(),
            "GAME_DATE_MSK": tipoff.astimezone(MSK).date().isoformat(),
            "GAME_TIME_UTC": tipoff.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            "HOME_TEAM_ID": NBA_TEAMS[home_abbr], "VISITOR_TEAM_ID": NBA_TEAMS[away_abbr],
            "HOME_TEAM_ABBREVIATION": home_abbr, "VISITOR_TEAM_ABBREVIATION": away_abbr,
            "HOME_TEAM_SCORE": score(home), "VISITOR_TEAM_SCORE": score(away),
            "GAME_STATUS": "Final" if status.get("completed") else (status.get("shortDetail", "TBD") if state != "pre" else "Scheduled"),
            "GAME_STATUS_ID": 3 if status.get("completed") else (2 if state == "in" else 1),
        }

    def games_on_date(self, date):
        # Moscow's midnight-to-midnight interval intersects two US calendar days.
        days = [date - timedelta(days=1), date]
        def fetch_day(day):
            ttl = 3600 if day < datetime.now(MSK).date() - timedelta(days=1) else 30
            return self._get(f'scoreboard?dates={day:%Y%m%d}&limit=100', ttl)["events"]
        with ThreadPoolExecutor(max_workers=2) as executor:
            events = [event for chunk in executor.map(fetch_day, days) for event in chunk]
        games = {}
        for event in events:
            game = self.normalize(event)
            if game and game["GAME_DATE_MSK"] == date.isoformat():
                games[game["GAME_ID"]] = game
        return sorted(games.values(), key=lambda game: game["GAME_TIME_UTC"])

    def team_games(self, team_id):
        if team_id not in NBA_TEAMS.values():
            raise ValueError("Unknown NBA team")
        # ESPN team identifiers differ from NBA identifiers; resolve them by abbreviation.
        request = Request(f"{BASE}/teams?limit=100", headers={"User-Agent": "NBA-dashboard/1.0"})
        with self.lock:
            mapping = getattr(self, "team_ids", None)
        if mapping is None:
            with urlopen(request, timeout=8) as response:
                payload = json.load(response)
            mapping = {}
            for item in payload["sports"][0]["leagues"][0]["teams"]:
                team = item["team"]
                abbr = ALIASES.get(team["abbreviation"], team["abbreviation"])
                if abbr in NBA_TEAMS:
                    mapping[NBA_TEAMS[abbr]] = team["id"]
            with self.lock:
                self.team_ids = mapping
        now = datetime.now(MSK)
        season = now.year + (1 if now.month >= 9 else 0)
        events = []
        # Both regular season and postseason can contain upcoming fixtures.
        for season_type in (2, 3):
            data = self._get(f'teams/{mapping[team_id]}/schedule?season={season}&seasontype={season_type}', 300)
            events.extend(data["events"])
        games = {}
        for event in events:
            game = self.normalize(event)
            if game:
                games[game["GAME_ID"]] = game
        return list(games.values())
