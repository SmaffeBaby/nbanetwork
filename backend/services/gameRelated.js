const axios = require('axios')
const fetchWithCache = require('../utils/fetchWithCache')
const { getEspnSummary, normalizeSummary } = require('./espnGameService')
const { getGamesByDate } = require('./gamesService')
const { dateKey } = require('./games/identity')
const ALIASES = { NY: 'NYK', GS: 'GSW', SA: 'SAS', NO: 'NOP', UTAH: 'UTA', WSH: 'WAS' }
const abbr = team => ALIASES[team?.abbreviation] || team?.abbreviation || ''
const score = value => value == null ? null : Number.isFinite(Number(value?.value ?? value)) ? Number(value?.value ?? value) : null
function scheduleGames(events) {
    return (events || []).flatMap(event => {
        const c = event.competitions?.[0], competitors = c?.competitors || []
        const home = competitors.find(p => p.homeAway === 'home'), away = competitors.find(p => p.homeAway === 'away')
        if (!home || !away || !/^\d{9}$/.test(String(event.id)) || !Number.isFinite(Date.parse(event.date)) || !c.status?.type?.completed || /CANCEL|POSTPON/i.test(c.status.type.name || '')) return []
        return [{ id: `espn:${event.id}`, datetime: event.date, status: 'Final', period: 0,
            home_team: { id: String(home.id || home.team?.id), abbreviation: abbr(home.team), full_name: home.team?.displayName || abbr(home.team) },
            visitor_team: { id: String(away.id || away.team?.id), abbreviation: abbr(away.team), full_name: away.team?.displayName || abbr(away.team) },
            home_team_score: score(home.score), visitor_team_score: score(away.score) }]
    })
}
function selectRecent(games, id, before, teamId) {
    return [...new Map(games.filter(g => g.id !== id && Date.parse(g.datetime) < Date.parse(before) &&
        [String(g.home_team.id), String(g.visitor_team.id)].includes(String(teamId))).map(g => [g.id, g])).values()]
        .sort((a, b) => Date.parse(b.datetime) - Date.parse(a.datetime) || String(b.id).localeCompare(String(a.id))).slice(0, 3)
}
async function schedule(teamId, year, type) {
    return fetchWithCache({ key: `related-team-schedule:${teamId}:${year}:${type}`, ttl: 300000, fetcher: async () => {
        const { data } = await axios.get(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/schedule`, { params: { season: year, seasontype: type }, timeout: 10000 })
        if (!Array.isArray(data.events)) throw new Error('Team schedule unavailable')
        return scheduleGames(data.events)
    } })
}
async function recentTeamGames(team, year, currentId, before) {
    const current = await Promise.all([schedule(team.id, year, 2), schedule(team.id, year, 3)])
    let games = selectRecent(current.flat(), currentId, before, team.id)
    if (games.length < 3) {
        const previous = await Promise.all([schedule(team.id, year - 1, 2), schedule(team.id, year - 1, 3)])
        games = selectRecent([...current.flat(), ...previous.flat()], currentId, before, team.id)
    }
    return { team: { id: String(team.id), abbr: abbr(team.team), name: team.team?.displayName || abbr(team.team) }, games }
}
async function relatedGames(id) {
    const raw = await getEspnSummary(id), recap = normalizeSummary(id, raw)
    const c = raw.header.competitions[0], date = dateKey(recap.dateUTC)
    const utc = new Date(recap.dateUTC), year = Number(raw.header.season?.year) || utc.getUTCFullYear() + (utc.getUTCMonth() >= 9 ? 1 : 0)
    const teams = ['away', 'home'].map(side => c.competitors.find(p => p.homeAway === side))
    const results = await Promise.allSettled([
        ...teams.map(team => recentTeamGames(team, year, id, recap.dateUTC)),
        getGamesByDate(date)
    ])
    return { date,
        recent: results.slice(0, 2).map((result, index) => result.status === 'fulfilled' ? result.value : { team: { id: String(teams[index].id), abbr: abbr(teams[index].team), name: teams[index].team.displayName }, games: [], error: 'Не удалось загрузить последние матчи команды.' }),
        sameDay: results[2].status === 'fulfilled' ? { games: results[2].value.filter(g => g.id !== id && dateKey(g.datetime) === date).sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime)) } : { games: [], error: 'Не удалось загрузить матчи за этот день.' }
    }
}
module.exports = { relatedGames, scheduleGames, selectRecent }
