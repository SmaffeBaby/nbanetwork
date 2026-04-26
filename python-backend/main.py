from fastapi import FastAPI
from nba_api.stats.endpoints import leaguestandings
from nba_api.stats.endpoints import leaguedashplayerstats, playergamelog
from nba_api.stats.endpoints import teamgamelog
from nba_api.stats.endpoints import scoreboardv2
from datetime import datetime, timedelta
from nba_api.stats.endpoints import boxscoresummaryv2, boxscoretraditionalv2
from nba_api.stats.endpoints import boxscoretraditionalv3

app = FastAPI()

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
        all_games = []
        today = datetime.today()
        days_ahead = 7

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

                all_games.append([
                    g["GAME_ID"],
                    g["GAME_DATE_EST"],
                    matchup,
                    g["GAME_STATUS_TEXT"]
                ])

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
    dt = datetime.strptime(date, "%Y-%m-%d")
    formatted = dt.strftime("%m/%d/%Y")

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

    games = []

    if game_header:
        for row in game_header["rowSet"]:
            game = dict(zip(game_header["headers"], row))
            gid = game["GAME_ID"]

            teams = teams_map.get(gid, [])

            home = next((t for t in teams if t["TEAM_ID"] == game["HOME_TEAM_ID"]), None)
            away = next((t for t in teams if t["TEAM_ID"] == game["VISITOR_TEAM_ID"]), None)

            games.append({
                "GAME_ID": game["GAME_ID"],

                "GAME_DATE_EST": game["GAME_DATE_EST"],

                "HOME_TEAM_ID": game["HOME_TEAM_ID"],
                "VISITOR_TEAM_ID": game["VISITOR_TEAM_ID"],

                "HOME_TEAM_ABBREVIATION": home["TEAM_ABBREVIATION"] if home else None,
                "VISITOR_TEAM_ABBREVIATION": away["TEAM_ABBREVIATION"] if away else None,

                "HOME_TEAM_SCORE": home["PTS"] if home else None,
                "VISITOR_TEAM_SCORE": away["PTS"] if away else None,

                "GAME_STATUS": game["GAME_STATUS_TEXT"]
            })

    return games

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