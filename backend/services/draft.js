const axios = require('axios')
const cache = require('../utils/fetchWithCache')
const aliases = { GS: 'GSW', NY: 'NYK', SA: 'SAS', NO: 'NOP', UTAH: 'UTA', WSH: 'WAS', SEA: 'OKC', NJ: 'BKN', NJN: 'BKN', VAN: 'MEM', NOH: 'NOP', NOK: 'NOP', CHH: 'CHA' }
const canonical = value => aliases[value] || value
const validTeams = new Set(Object.values(require('../constants/teamMap')).map(t => t.abbr))

function normalizeDraft(data, year) {
    if (Number(data.year) !== year || !Array.isArray(data.picks) || !Array.isArray(data.teams)) throw new Error('Данные другого розыгрыша или неполный ответ ESPN')
    const team = value => value ? { abbr: canonical(value.abbreviation), name: value.displayName, localLogo: validTeams.has(canonical(value.abbreviation)) } : null
    const teams = new Map(data.teams.map(t => [String(t.id), team(t)]))
    const positions = new Map((data.positions || []).map(p => [String(p.id), p.abbreviation]))
    const seen = new Set()
    const picks = data.picks.map(p => {
        const round = Number(p.round), overall = Number(p.overall), pick = Number(p.pick)
        if (![1, 2].includes(round) || !Number.isInteger(overall) || overall < 1 || !Number.isInteger(pick) || pick < 1 || seen.has(overall)) throw new Error('Некорректный номер пика')
        seen.add(overall)
        const selectedBy = teams.get(String(p.teamId)) || null
        const destination = p.traded && /Traded to\s+([A-Z]+)/.exec(p.tradeNote || '')?.[1]
        const tradedTo = destination ? [...teams.values()].find(t => t.abbr === canonical(destination)) || null : null
        const athlete = p.athlete
        // The draft prospect ID differs from the ID used by ESPN player headshots.
        const espnId = String(athlete?.alternativeId || '')
        return { round, overall, pick, selectedBy, owner: tradedTo || selectedBy, traded: Boolean(p.traded), tradeNote: p.tradeNote || null,
            player: athlete?.displayName ? { name: athlete.displayName, photoId: /^\d{1,12}$/.test(espnId) ? `espn:${espnId}` : null, position: positions.get(String(athlete.position?.id)) || null, school: athlete.team?.shortDisplayName || athlete.leagueAffiliation || null } : null }
    }).sort((a, b) => a.overall - b.overall)
    return { year, completed: data.status?.name === 'COMPLETED', picks, updatedAt: new Date().toISOString() }
}

async function draft(year) {
    return cache({ key: `draft-v1:${year}`, ttl: 300000, fetcher: async () => {
        const { data } = await axios.get('https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/draft', { params: { region: 'us', lang: 'en', season: year }, timeout: 15000 })
        return normalizeDraft(data, year)
    } })
}

module.exports = { draft, normalizeDraft }
