from fastapi import FastAPI
from nba_api.stats.endpoints import leaguestandings
from nba_api.stats.endpoints import leaguedashplayerstats, playergamelog
from nba_api.stats.endpoints import teamgamelog

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