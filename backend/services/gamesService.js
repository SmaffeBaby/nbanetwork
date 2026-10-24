const fetchWithCache = require('../utils/fetchWithCache')
const TEAM_MAP = require('../constants/teamMap')

async function getGamesByDate(dateStr) {
    // Share the calendar cache with the date picker and recent games.
    const { resolveGamesByDate, isAllowedDate } = require('../routes/dailyGames')
    if (!isAllowedDate(dateStr)) throw new Error('Invalid date')
    const games = await fetchWithCache({
        key: `games-by-date-memory:${dateStr}`,
        ttl: 30000,
        fetcher: () => resolveGamesByDate(dateStr)
    })
    const team = (id, abbr) => ({
        id, abbreviation: abbr || TEAM_MAP[id]?.abbr || '',
        full_name: TEAM_MAP[id]?.name || abbr || ''
    })
    return games.map(game => ({
        id: game.GAME_ID,
        home_team: team(game.HOME_TEAM_ID, game.HOME_TEAM_ABBREVIATION),
        visitor_team: team(game.VISITOR_TEAM_ID, game.VISITOR_TEAM_ABBREVIATION),
        home_team_score: game.HOME_TEAM_SCORE,
        visitor_team_score: game.VISITOR_TEAM_SCORE,
        status: game.GAME_STATUS,
        period: game.GAME_STATUS_ID === 2 ? 1 : 0,
        datetime: game.GAME_TIME_UTC
    }))
}
module.exports = { getGamesByDate }
