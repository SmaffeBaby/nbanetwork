const axios = require('axios')
const cache = require('../utils/fetchWithCache')
const { gameCompetition } = require('./gameCompetition')

const ROOT = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba'
const east = new Set('ATL BOS BKN CHA CHI CLE DET IND MIA MIL NYK ORL PHI TOR WAS'.split(' '))
const valid = new Set(Object.values(require('../constants/teamMap')).map(t => t.abbr))
const aliases = { NY: 'NYK', GS: 'GSW', SA: 'SAS', NO: 'NOP', UTAH: 'UTA', WSH: 'WAS' }

function normalizeEvent(event, year) {
    const c = event.competitions?.[0], competition = gameCompetition(event, 5)
    if (!c || competition?.kind !== 'play-in' || Number(event.season?.year) !== year || !/^\d{9}$/.test(String(event.id))) return null
    const status = c.status || event.status
    const side = homeAway => {
        const p = c.competitors?.find(t => t.homeAway === homeAway)
        const abbr = aliases[p?.team?.abbreviation] || p?.team?.abbreviation
        if (!valid.has(abbr)) return null
        const value = p.score?.value ?? p.score
        return { abbr, name: p.team.displayName, score: status?.type?.completed && value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null }
    }
    const home = side('home'), away = side('away')
    if (!home || !away || east.has(home.abbr) !== east.has(away.abbr) || !Number.isFinite(Date.parse(event.date))) return null
    const notes = (c.notes || []).map(n => n.headline || n.text || '').join(' ')
    const stage = /7th.*8th/i.test(notes) ? 'seventh' : /9th.*10th/i.test(notes) ? 'elimination' : 'eighth'
    return { id: `espn:${event.id}`, date: event.date, conference: east.has(home.abbr) ? 'east' : 'west', stage, competition,
        status: status?.type?.completed ? 'Final' : status?.type?.state === 'in' ? 'Live' : 'Scheduled', completed: Boolean(status?.type?.completed), home, away }
}

async function playIn(year) {
    return cache({ key: `play-in-v1:${year}`, ttl: 60000, fetcher: async () => {
        const { data: directory } = await axios.get(`${ROOT}/teams`, { params: { limit: 100 }, timeout: 10000 })
        const teams = directory.sports?.[0]?.leagues?.[0]?.teams || []
        if (teams.length !== 30) throw new Error('Неполный список команд')
        const queue = [...teams], events = new Map(), missing = []
        await Promise.all(Array.from({ length: 8 }, async () => {
            while (queue.length) {
                const { team } = queue.shift()
                try {
                    const { data } = await axios.get(`${ROOT}/teams/${team.id}/schedule`, { params: { season: year, seasontype: 5 }, timeout: 10000 })
                    const season = data.requestedSeason || data.season
                    if (Number(season?.year) !== year || Number(season?.type) !== 5 || !Array.isArray(data.events)) throw new Error('Другой сезон')
                    for (const e of data.events) {
                        const game = normalizeEvent(e, year)
                        if (game) events.set(game.id, game)
                    }
                } catch (error) { missing.push(team.abbreviation) }
            }
        }))
        if (missing.length === teams.length) throw new Error('Расписание недоступно')
        const games = [...events.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
        // A failed schedule for a non-participant cannot make all six published slots incomplete.
        const allSlots = ['east', 'west'].every(conference => ['seventh', 'elimination', 'eighth'].every(stage => games.some(g => g.conference === conference && g.stage === stage)))
        return { year, games, complete: missing.length === 0 || allSlots, updatedAt: new Date().toISOString() }
    } })
}

module.exports = { playIn, normalizeEvent }
