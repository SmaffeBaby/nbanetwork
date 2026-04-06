from fastapi import FastAPI
from nba_api.stats.endpoints import leaguestandings

app = FastAPI()

@app.get("/standings/{season}")
def get_standings(season: str):
    data = leaguestandings.LeagueStandings(season=season)
    return data.get_dict()