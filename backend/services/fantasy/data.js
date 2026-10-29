const axios = require('axios')
const fetchWithCache = require('../../utils/fetchWithCache')
const { DAY, positions } = require('./rules')
const ALIASES = { NY: 'NYK', GS: 'GSW', SA: 'SAS', NO: 'NOP', UTAH: 'UTA', WSH: 'WAS' }
const ROOT = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba'
async function request(path, params) {
    const { data } = await axios.get(`${ROOT}/${path}`, { params, timeout: 8000 })
    return data
}
async function schedule(week) {
    return fetchWithCache({ key: `fantasy-schedule:${week.id}`, ttl: 60000, fetcher: async () => {
        // Include the preceding UTC date because our week starts at 21:00 UTC.
        const dates = Array.from({ length: 8 }, (_, i) => new Date(Date.parse(week.start) + i * DAY).toISOString().slice(0, 10).replaceAll('-', ''))
        const days = await Promise.all(dates.map(dates => request('scoreboard', { dates, limit: 100 })))
        if (days.some(day => !Array.isArray(day.events))) throw new Error('Расписание недоступно')
        const games = new Map()
        for (const day of days) for (const event of day.events) {
            const start = Date.parse(event.date)
            const c = event.competitions?.[0]
            if (start >= Date.parse(week.start) && start < Date.parse(week.end) && c && !/CANCEL|POSTPON/i.test(c.status?.type?.name || '')) games.set(event.id, { id: event.id, start: event.date, completed: Boolean(c.status?.type?.completed), teams: c.competitors.map(p => ({ id: String(p.team.id), abbr: ALIASES[p.team.abbreviation] || p.team.abbreviation, homeAway:p.homeAway })) })
        }
        return [...games.values()]
    } })
}
async function catalog(week, fresh = false) {
    const games = await schedule(week)
    const teams = new Map(games.flatMap(g => g.teams.map(t => [t.id, t])))
    const players = await Promise.all([...teams.values()].map(async team => {
        const load = () => request(`teams/${team.id}/roster`)
        const data = fresh ? await load() : await fetchWithCache({ key: `fantasy-roster:${team.id}`, ttl: 120000, fetcher: load })
        if (!Array.isArray(data.athletes)) throw new Error('Состав команды недоступен')
        const teamGames = games.filter(g => g.teams.some(t => t.id === team.id))
        return data.athletes.map(p => ({ id: String(p.id), name: p.displayName, team: team.abbr, positions: positions(p.position?.abbreviation), injury: (p.injuries || []).filter(i => !/^(active|healthy|available)$/i.test(i.status || '')).map(i => i.status || 'Injury').join(', '), schedule: teamGames.sort((a,b) => Date.parse(a.start)-Date.parse(b.start)).map(g => ({ id:g.id, start:g.start, matchup:g.teams.map(t => t.abbr).join(' — '), teams:g.teams, completed:g.completed })), remaining: teamGames.filter(g => Date.parse(g.start) > Date.now()).length }))
    }))
    return players.flat().filter(p => p.positions.length).sort((a, b) => a.name.localeCompare(b.name))
}
module.exports = { request, schedule, catalog }

async function playerDetails(id, week, profile) {
    const { seasonAthletes } = require('../gamePreview')
    const now = new Date(Date.now()+3*3600000)
    const year = now.getUTCFullYear() + (now.getUTCMonth() >= 6 ? 1 : 0)
    const [data, games, fantasy] = await Promise.all([seasonAthletes(year, 2), schedule(week), playerFantasy(id, week, profile)])
    const row = data.athletes.find(p => String(p.athlete.id) === id)
    const result = await require('./seasonStats').seasonPlayerStats(data,id,year)
    const stats = result.stats
    return { id, fantasy, season:`${year-1}–${String(year).slice(-2)}`, gamesPlayed:stats.gamesPlayed ?? 0, ...result, schedule:games.filter(g => g.teams.some(t => t.abbr === (ALIASES[row?.athlete.teamShortName] || row?.athlete.teamShortName))).map(g=>({...g,matchup:g.teams.map(t=>t.abbr).join(' — ')})) }
}
module.exports.playerDetails = playerDetails

async function playerFantasy(id, week, profile) {
    const db = require('../../lib/supabase').getAdmin()
    let bonus = { bonusPoints: 0, bonusRate: 0, bonusLevel: 1 }
    let query = db.from('fantasy_scores').select('game_id,starts_at,points,stats,observed_at').eq('player_id', id).eq('week', week.id).order('starts_at')
    if (profile) {
        const { data: entry, error } = await db.from('fantasy_entries').select('lineup,confirmed_at,ends_at').eq('user_id', profile).eq('week', week.id).maybeSingle().abortSignal(AbortSignal.timeout(8000))
        if (error) throw error
        if (!entry?.lineup.some(p => p.id === id)) return { points: 0, basePoints: 0, ...bonus, games: [], profile: true }
        query = query.gte('starts_at', entry.confirmed_at).lt('starts_at', entry.ends_at)
        const { data: result, error: bonusError } = await db.from('fantasy_player_results').select('bonus_points,bonus_rate,bonus_level').eq('user_id', profile).eq('week', week.id).eq('player_id', id).single().abortSignal(AbortSignal.timeout(8000))
        if (bonusError) throw bonusError
        bonus = { bonusPoints: Number(result.bonus_points), bonusRate: Number(result.bonus_rate), bonusLevel: result.bonus_level }
    }
    const { data, error } = await query.abortSignal(AbortSignal.timeout(8000))
    if (error) throw error
    const { scoreBreakdown } = require('./rules')
    const basePoints = Math.round(data.reduce((sum, g) => sum + Number(g.points), 0) * 10) / 10
    return { profile: Boolean(profile), basePoints, ...bonus, points: Math.round((basePoints + bonus.bonusPoints) * 10) / 10,
        games: data.map(g => ({ id: g.game_id.replace('espn:', ''), start: g.starts_at, points: Number(g.points),
            matchup: `${g.stats.awayAbbr} — ${g.stats.homeAbbr}`, breakdown: scoreBreakdown(g.stats, g.stats.won) })) }
}
