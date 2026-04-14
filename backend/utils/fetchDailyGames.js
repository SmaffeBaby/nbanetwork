const axios = require('axios')

function formatDateToNBA(dateStr) {
    return dateStr.replaceAll('-', '')
}

async function fetchDailyGames(dateStr) {
    const date = formatDateToNBA(dateStr)

    const url = `https://cdn.nba.com/static/json/staticData/scores/scores_${date}.json`

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://www.nba.com'
        }
    })

    const games = data?.scoreboard?.games || []

    return games.map(g => ({
        id: g.gameId,
        datetime: g.gameTimeUTC,

        home_team: {
            abbreviation: g.homeTeam.teamTricode,
            name: g.homeTeam.teamName,
            score: g.homeTeam.score
        },

        visitor_team: {
            abbreviation: g.awayTeam.teamTricode,
            name: g.awayTeam.teamName,
            score: g.awayTeam.score
        }
    }))
}

module.exports = fetchDailyGames