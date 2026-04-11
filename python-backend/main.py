from fastapi import FastAPI
from nba_api.stats.endpoints import leaguestandings
from nba_api.stats.endpoints import leaguedashplayerstats, playergamelog
from nba_api.stats.endpoints import teamgamelog
from nba_api.stats.endpoints import scoreboardv2
from datetime import datetime, timedelta

app = FastAPI()

@app.get("/standings/{season}")
def get_standings(season: str):
    data = leaguestandings.LeagueStandings(season=season)
    return data.get_dict()

@app.get("/player-stats/{season}")
def get_player_stats(season: str):
    stats = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season,
        season_type_all_star="Regular Season",  # 🔥 важно
        per_mode_detailed="PerGame",
        measure_type_detailed_defense="Base",
        timeout=60
    )
    return stats.get_dict()

@app.get("/player-gamelog/{player_id}/{season}")
def get_player_gamelog(player_id: int, season: str):
    try:
        data = playergamelog.PlayerGameLog(player_id=player_id, season=season)
        return data.get_dict()
    except Exception as e:
        return {"error": str(e)}

@app.get("/team-games/{team_id}/{season}")
def get_team_games(team_id: int, season: str):
    try:
        data = teamgamelog.TeamGameLog(
            team_id=team_id,
            season=season,
            season_type_all_star="Regular Season"
        )
        return data.get_dict()
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