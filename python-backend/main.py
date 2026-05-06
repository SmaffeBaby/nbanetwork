from fastapi import FastAPI
import json
from urllib.request import Request, urlopen
from nba_api.stats.endpoints import leaguestandings
from nba_api.stats.endpoints import leaguedashplayerstats, playergamelog
from nba_api.stats.endpoints import playercareerstats
from nba_api.stats.static import players as static_players
from nba_api.stats.endpoints import teamgamelog
from nba_api.stats.endpoints import scoreboardv2
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from nba_api.stats.endpoints import boxscoresummaryv2, boxscoretraditionalv2
from nba_api.stats.endpoints import boxscoretraditionalv3
from nba_api.stats.endpoints import leaguegamelog

app = FastAPI()
MSK_TZ = ZoneInfo("Europe/Moscow")
SCHEDULE_URLS = [
    "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json",
    "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json",
]
NBA_CDN_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://www.nba.com",
}
STATIC_SCOREBOARD_CACHE = {}

def get_current_nba_season():
    now = datetime.now()
    year = now.year

    if now.month >= 10:
        return f"{year}-{str(year + 1)[-2:]}"
    else:
        return f"{year - 1}-{str(year)[-2:]}"

@app.get("/current-season")
def current_season():
    return {
        "season": get_current_nba_season()
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
    try:
        games_by_id = {}
        today = datetime.now(MSK_TZ).date()
        days_ahead = 7

        def parse_date(value):
            if not value:
                return None

            for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%m/%d/%Y %H:%M:%S", "%m/%d/%Y %I:%M:%S %p"):
                try:
                    return datetime.strptime(value[:19], fmt)
                except ValueError:
                    pass

            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                return None

        def add_game(game_id, game_date, matchup, game_time):
            game_dt = parse_date(game_date)
            if game_dt:
                game_day = game_dt.astimezone(MSK_TZ).date() if game_dt.tzinfo else game_dt.date()
                if game_day < today:
                    return
                sort_value = game_dt.timestamp()
            else:
                sort_value = 0

            games_by_id[game_id] = {
                "row": [game_id, game_date, matchup, game_time],
                "sort": sort_value,
            }

        for url in SCHEDULE_URLS:
            try:
                request = Request(url, headers={
                    "User-Agent": "Mozilla/5.0",
                    "Referer": "https://www.nba.com"
                })

                with urlopen(request, timeout=10) as response:
                    schedule = json.loads(response.read().decode("utf-8"))

                game_dates = schedule.get("leagueSchedule", {}).get("gameDates", [])

                for game_date_entry in game_dates:
                    for game in game_date_entry.get("games", []):
                        home = game.get("homeTeam", {})
                        away = game.get("awayTeam", {})

                        if home.get("teamId") != team_id and away.get("teamId") != team_id:
                            continue

                        game_id = game.get("gameId")
                        if not game_id:
                            continue

                        home_abbr = home.get("teamTricode") or home.get("teamAbbreviation")
                        away_abbr = away.get("teamTricode") or away.get("teamAbbreviation")
                        if not home_abbr or not away_abbr:
                            continue

                        game_date_value = (
                            game.get("gameDateTimeEst")
                            or game.get("gameDateEst")
                            or game.get("gameDateUTC")
                            or game_date_entry.get("gameDate")
                        )

                        game_time = game.get("gameStatusText") or game.get("gameTimeEst") or "TBD"

                        add_game(
                            game_id,
                            game_date_value,
                            f"{away_abbr} @ {home_abbr}",
                            game_time
                        )
            except Exception as e:
                print(f"Failed to fetch NBA schedule from {url}: {e}")

            if games_by_id:
                break

        if not games_by_id:
            for i in range(days_ahead):
                date = today + timedelta(days=i)
                game_date = date.strftime("%m/%d/%Y")

                data = scoreboardv2.ScoreboardV2(
                    game_date=game_date,
                    league_id="00"
                )

                result = data.get_dict()

                game_header = next(
                    (r for r in result["resultSets"] if r["name"] == "GameHeader"),
                    None
                )

                line_score = next(
                    (r for r in result["resultSets"] if r["name"] == "LineScore"),
                    None
                )

                if not game_header or not line_score:
                    continue

                gh_headers = game_header["headers"]
                games = []

                for row in game_header["rowSet"]:
                    obj = {}
                    for i, h in enumerate(gh_headers):
                        obj[h] = row[i]
                    games.append(obj)

                ls_headers = line_score["headers"]
                teams = []

                for row in line_score["rowSet"]:
                    obj = {}
                    for i, h in enumerate(ls_headers):
                        obj[h] = row[i]
                    teams.append(obj)

                games_map = {}

                for t in teams:
                    gid = t["GAME_ID"]
                    if gid not in games_map:
                        games_map[gid] = []
                    games_map[gid].append(t)

                for g in games:
                    if g["HOME_TEAM_ID"] != team_id and g["VISITOR_TEAM_ID"] != team_id:
                        continue

                    gid = g["GAME_ID"]
                    if gid not in games_map:
                        continue

                    teams_in_game = games_map[gid]

                    if len(teams_in_game) < 2:
                        continue

                    t1, t2 = teams_in_game

                    if t1["TEAM_ID"] == g["HOME_TEAM_ID"]:
                        home = t1
                        away = t2
                    else:
                        home = t2
                        away = t1

                    matchup = f"{away['TEAM_ABBREVIATION']} @ {home['TEAM_ABBREVIATION']}"

                    add_game(
                        g["GAME_ID"],
                        g["GAME_DATE_EST"],
                        matchup,
                        g["GAME_STATUS_TEXT"]
                    )

        all_games = [
            item["row"]
            for item in sorted(games_by_id.values(), key=lambda item: item["sort"])
        ]

        return {
            "resultSets": [
                {
                    "headers": ["GAME_ID", "GAME_DATE", "MATCHUP", "GAME_TIME"],
                    "rowSet": all_games
                }
            ]
        }

    except Exception as e:
        return {"error": str(e)}

@app.get("/game-detail/{game_id}")
def get_game_detail(game_id: str):
    try:
        summary = boxscoresummaryv2.BoxScoreSummaryV2(game_id=game_id)
        boxscore = boxscoretraditionalv2.BoxScoreTraditionalV2(game_id=game_id)

        summary_dict = summary.get_dict()
        boxscore_dict = boxscore.get_dict()

        return {
            "game_id": game_id,
            "summary": summary_dict,
            "boxscore": boxscore_dict
        }

    except Exception as e:
        return {"error": str(e)}


@app.get("/games/by-date/{date}")
def get_games_by_date(date: str):
    target_msk_date = datetime.strptime(date, "%Y-%m-%d").date()
    season = (
        f"{target_msk_date.year}-{str(target_msk_date.year + 1)[-2:]}"
        if target_msk_date.month >= 10
        else f"{target_msk_date.year - 1}-{str(target_msk_date.year)[-2:]}"
    )
    dates_to_fetch = [
        target_msk_date - timedelta(days=1),
        target_msk_date,
        target_msk_date + timedelta(days=1),
    ]

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

    def get_static_scoreboard(nba_date):
        return fetch_static_scoreboard(nba_date)

    def find_static_game(game_id, game_date):
        for date_candidate in [
            game_date - timedelta(days=1),
            game_date,
            game_date + timedelta(days=1),
        ]:
            try:
                static_game = get_static_scoreboard(date_candidate).get(game_id)
                if static_game:
                    return static_game
            except Exception as e:
                print(f"Failed to fetch NBA static scoreboard for {date_candidate}: {e}")

        return {}

    def parse_utc(value):
        if not value:
            return None

        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    def add_static_games():
        fetched_any_scoreboard = False

        for nba_date in dates_to_fetch:
            try:
                static_games = get_static_scoreboard(nba_date)
                fetched_any_scoreboard = True
            except Exception as e:
                print(f"Failed to fetch NBA static scoreboard for {nba_date}: {e}")
                continue

            for gid, game in static_games.items():
                game_time_utc = game.get("gameTimeUTC")
                game_dt_utc = parse_utc(game_time_utc)

                if game_dt_utc:
                    game_msk_date = game_dt_utc.astimezone(MSK_TZ).date()
                    if game_msk_date != target_msk_date:
                        continue
                    game_date_msk = game_msk_date.isoformat()
                else:
                    game_date_value = (
                        game.get("gameDateEst")
                        or game.get("gameDateUTC")
                        or game.get("gameDate")
                        or nba_date.isoformat()
                    )
                    game_date_msk = str(game_date_value)[:10]
                    if game_date_msk != target_msk_date.isoformat():
                        continue

                home = game.get("homeTeam", {})
                away = game.get("awayTeam", {})

                games_by_id[gid] = {
                    "GAME_ID": gid,

                    "GAME_DATE_EST": game.get("gameDateEst") or game.get("gameDateUTC") or f"{nba_date.isoformat()}T00:00:00",
                    "GAME_DATE_MSK": game_date_msk,
                    "GAME_TIME_UTC": game_time_utc,

                    "HOME_TEAM_ID": home.get("teamId"),
                    "VISITOR_TEAM_ID": away.get("teamId"),

                    "HOME_TEAM_ABBREVIATION": home.get("teamTricode") or home.get("teamAbbreviation"),
                    "VISITOR_TEAM_ABBREVIATION": away.get("teamTricode") or away.get("teamAbbreviation"),

                    "HOME_TEAM_SCORE": home.get("score"),
                    "VISITOR_TEAM_SCORE": away.get("score"),

                    "GAME_STATUS": game.get("gameStatusText") or game.get("gameStatus") or ""
                }

        return fetched_any_scoreboard

    def add_completed_games_from_log(season_type):
        data = leaguegamelog.LeagueGameLog(
            season=season,
            season_type_all_star=season_type
        ).get_dict()

        result_set = data["resultSets"][0]
        headers = result_set["headers"]
        games_map = {}

        for row in result_set["rowSet"]:
            team_game = dict(zip(headers, row))
            game_date = datetime.strptime(team_game["GAME_DATE"], "%Y-%m-%d").date()

            # NBA games usually start on the previous US calendar day for Moscow.
            # With no exact UTC timestamp in LeagueGameLog, this keeps completed
            # playoff games aligned with the app's MSK calendar.
            game_date_msk = game_date + timedelta(days=1)
            if game_date_msk != target_msk_date:
                continue

            games_map.setdefault(team_game["GAME_ID"], []).append(team_game)

        for gid, teams in games_map.items():
            if len(teams) < 2:
                continue

            home = next((t for t in teams if " vs. " in t.get("MATCHUP", "")), None)
            away = next((t for t in teams if " @ " in t.get("MATCHUP", "")), None)

            if not home or not away:
                continue

            game_date = datetime.strptime(home["GAME_DATE"], "%Y-%m-%d").date()
            static_game = find_static_game(gid, game_date)
            game_time_utc = static_game.get("gameTimeUTC")
            game_dt_utc = parse_utc(game_time_utc)
            game_date_msk = (
                game_dt_utc.astimezone(MSK_TZ).date().isoformat()
                if game_dt_utc
                else target_msk_date.isoformat()
            )

            games_by_id[gid] = {
                "GAME_ID": gid,

                "GAME_DATE_EST": f"{home['GAME_DATE']}T00:00:00",
                "GAME_DATE_MSK": game_date_msk,
                "GAME_TIME_UTC": game_time_utc,

                "HOME_TEAM_ID": home["TEAM_ID"],
                "VISITOR_TEAM_ID": away["TEAM_ID"],

                "HOME_TEAM_ABBREVIATION": home["TEAM_ABBREVIATION"],
                "VISITOR_TEAM_ABBREVIATION": away["TEAM_ABBREVIATION"],

                "HOME_TEAM_SCORE": home["PTS"],
                "VISITOR_TEAM_SCORE": away["PTS"],

                "GAME_STATUS": "Final"
            }

    games_by_id = {}

    if add_static_games():
        return list(games_by_id.values())

    for nba_date in dates_to_fetch:
        formatted = nba_date.strftime("%m/%d/%Y")

        data = scoreboardv2.ScoreboardV2(
            game_date=formatted,
            league_id="00"
        )

        result = data.get_dict()

        game_header = None
        line_score = None

        for rs in result["resultSets"]:
            if rs["name"] == "GameHeader":
                game_header = rs
            if rs["name"] == "LineScore":
                line_score = rs

        teams_map = {}

        if line_score:
            for row in line_score["rowSet"]:
                team = dict(zip(line_score["headers"], row))
                gid = team["GAME_ID"]
                teams_map.setdefault(gid, []).append(team)

        static_games = {}
        try:
            static_games = get_static_scoreboard(nba_date)
        except Exception as e:
            print(f"Failed to fetch NBA static scoreboard for {nba_date}: {e}")

        if game_header:
            for row in game_header["rowSet"]:
                game = dict(zip(game_header["headers"], row))
                gid = game["GAME_ID"]

                teams = teams_map.get(gid, [])

                home = next((t for t in teams if t["TEAM_ID"] == game["HOME_TEAM_ID"]), None)
                away = next((t for t in teams if t["TEAM_ID"] == game["VISITOR_TEAM_ID"]), None)

                static_game = static_games.get(gid, {})
                game_time_utc = static_game.get("gameTimeUTC")
                game_dt_utc = parse_utc(game_time_utc)

                if game_dt_utc:
                    game_msk_date = game_dt_utc.astimezone(MSK_TZ).date()
                    if game_msk_date != target_msk_date:
                        continue
                    game_date_msk = game_msk_date.isoformat()
                else:
                    game_date_msk = game["GAME_DATE_EST"][:10]
                    if game_date_msk != target_msk_date.isoformat():
                        continue

                games_by_id[gid] = {
                    "GAME_ID": game["GAME_ID"],

                    "GAME_DATE_EST": game["GAME_DATE_EST"],
                    "GAME_DATE_MSK": game_date_msk,
                    "GAME_TIME_UTC": game_time_utc,

                    "HOME_TEAM_ID": game["HOME_TEAM_ID"],
                    "VISITOR_TEAM_ID": game["VISITOR_TEAM_ID"],

                    "HOME_TEAM_ABBREVIATION": home["TEAM_ABBREVIATION"] if home else None,
                    "VISITOR_TEAM_ABBREVIATION": away["TEAM_ABBREVIATION"] if away else None,

                    "HOME_TEAM_SCORE": home["PTS"] if home else None,
                    "VISITOR_TEAM_SCORE": away["PTS"] if away else None,

                    "GAME_STATUS": game["GAME_STATUS_TEXT"]
                }

    try:
        add_completed_games_from_log("Regular Season")
        add_completed_games_from_log("Playoffs")
    except Exception as e:
        print(f"Failed to fetch completed games from LeagueGameLog: {e}")

    return list(games_by_id.values())

@app.get("/game-boxscore-v3/{game_id}/quarter/{quarter}")
def get_game_boxscore_quarter(game_id: str, quarter: int):
    try:
        data = boxscoretraditionalv3.BoxScoreTraditionalV3(
            game_id=game_id,
            range_type=1,
            start_period=quarter,
            end_period=quarter,
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