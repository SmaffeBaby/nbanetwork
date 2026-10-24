const axios = require('axios')
const fetchWithCache = require('../utils/fetchWithCache')
const TEAM_MAP = require('../constants/teamMap')
const { clockSeconds } = require('./periodBoxscore')
const ALIASES = { NY: 'NYK', GS: 'GSW', SA: 'SAS', NO: 'NOP', UTAH: 'UTA', WSH: 'WAS' }
const number = value => {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
}
function normalizeStats(values = {}) {
    const result = {}
    const names = { minutes: 'minutes', points: 'points', rebounds: 'reboundsTotal', totalRebounds: 'reboundsTotal', assists: 'assists', steals: 'steals', blocks: 'blocks', turnovers: 'turnovers', offensiveRebounds: 'reboundsOffensive', defensiveRebounds: 'reboundsDefensive', fouls: 'foulsPersonal', plusMinus: 'plusMinusPoints', pointsInPaint: 'pointsInThePaint', fastBreakPoints: 'fastBreakPoints', secondChancePoints: 'secondChancePoints' }
    for (const [key, name] of Object.entries(names)) {
        if (values[key] !== undefined) result[name] = key === 'minutes' && String(values[key]).includes(':')
                ? number(String(values[key]).split(':')[0]) + number(String(values[key]).split(':')[1]) / 60
                : number(values[key])
    }
    for (const [key, prefix] of Object.entries({
        'fieldGoalsMade-fieldGoalsAttempted': 'fieldGoals',
        'threePointFieldGoalsMade-threePointFieldGoalsAttempted': 'threePointers',
        'freeThrowsMade-freeThrowsAttempted': 'freeThrows'
    })) {
        if (values[key] !== undefined) {
            const [made, attempted] = String(values[key]).split('-')
            result[`${prefix}Made`] = number(made)
            result[`${prefix}Attempted`] = number(attempted)
        }
    }
    return result
}
function buildLeadTracker(plays = []) {
    const points = []
    const summary = { biggestHomeLead: 0, biggestAwayLead: 0, timesTied: 0, leadChanges: 0, longestRun: 0 }
    let lastLeader = null, lastDiff = null, lastHome = 0, lastAway = 0, runSide = null, run = 0
    for (const play of plays) {
        if (!play.scoringPlay) continue
        const homeScore = Number(play.homeScore), awayScore = Number(play.awayScore)
        if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) continue
        const period = Number(play.period?.number || 1)
        const remaining = clockSeconds(play.clock?.displayValue)
        const elapsed = (period <= 4 ? (period - 1) * 720 : 2880 + (period - 5) * 300) + (period <= 4 ? 720 : 300) - remaining
        const diff = homeScore - awayScore
        const leader = diff > 0 ? 'home' : diff < 0 ? 'away' : null
        summary.biggestHomeLead = Math.max(summary.biggestHomeLead, diff)
        summary.biggestAwayLead = Math.max(summary.biggestAwayLead, -diff)
        if (diff === 0 && lastDiff !== null && lastDiff !== 0) summary.timesTied++
        if (leader && lastLeader && leader !== lastLeader) summary.leadChanges++
        if (leader) lastLeader = leader
        const side = homeScore > lastHome ? 'home' : 'away'
        const gained = side === 'home' ? homeScore - lastHome : awayScore - lastAway
        run = side === runSide ? run + gained : gained
        runSide = side
        summary.longestRun = Math.max(summary.longestRun, run)
        lastHome = homeScore; lastAway = awayScore; lastDiff = diff
        points.push({ actionNumber: play.id, period, clock: play.clock?.displayValue, elapsed, homeScore, awayScore, diff, description: play.text || '' })
    }
    return { points, summary }
}
function teamMeta(team) {
    const abbr = ALIASES[team.abbreviation] || team.abbreviation
    const found = Object.entries(TEAM_MAP).find(([, item]) => item.abbr === abbr)
    if (!found) throw new Error('Unknown NBA team')
    return { abbr, teamId: Number(found[0]), name: found[1].name }
}
function normalizeSummary(gameId, data) {
    const competition = data.header?.competitions?.[0]
    if (!competition || String(data.header.id) !== gameId.slice(5)) throw new Error('Invalid game summary')
    const status = competition.status?.type || {}
    const competitors = competition.competitors || []
    const sides = {}
    for (const side of ['home', 'away']) {
        const competitor = competitors.find(item => item.homeAway === side)
        if (!competitor) throw new Error('Missing game team')
        const meta = teamMeta(competitor.team)
        const stats = data.boxscore?.teams?.find(item => String(item.team.id) === String(competitor.id))
        const rawStats = Object.fromEntries((stats?.statistics || []).map(item => [item.name, item.displayValue]))
        const box = data.boxscore?.players?.find(item => String(item.team.id) === String(competitor.id))
        const players = []
        for (const group of box?.statistics || []) {
            for (const row of group.athletes || []) {
                const athlete = row.athlete || {}
                const raw = Object.fromEntries((group.keys || []).map((key, index) => [key, row.stats?.[index]]))
                players.push({
                    personId: `espn:${athlete.id}`, teamId: meta.teamId,
                    name: athlete.displayName, position: athlete.position?.abbreviation || '',
                    jerseyNum: athlete.jersey || '',
                    statistics: normalizeStats(raw),
                    notPlayingReason: row.didNotPlay ? (/injur|illness/i.test(row.reason || '') ? 'DND_INJURY' : 'DNP') : null,
                    notPlayingDescription: row.didNotPlay ? row.reason || '' : ''
                })
            }
        }
        for (const report of data.injuries || []) {
            if (String(report.team?.id) !== String(competitor.id)) continue
            for (const injury of report.injuries || []) {
                const athlete = injury.athlete || {}
                if (!athlete.id) continue
                let player = players.find(item => item.personId === `espn:${athlete.id}`)
                if (player && !player.notPlayingReason) continue
                if (!player) {
                    player = { personId: `espn:${athlete.id}`, teamId: meta.teamId, name: athlete.displayName, statistics: {} }
                    players.push(player)
                }
                player.notPlayingReason = 'INACTIVE_INJURY'
                player.notPlayingDescription = [injury.status, injury.details?.detail, injury.details?.type].filter(Boolean).join(' · ')
            }
        }
        sides[side] = { ...meta, score: status.state === 'pre' ? null : number(competitor.score), players,
            statistics: { ...normalizeStats(rawStats), points: status.state === 'pre' ? null : number(competitor.score) },
            linescores: competitor.linescores || [] }
    }
    const dateUTC = new Date(competition.date).toISOString()
    const dateMSK = new Date(dateUTC).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    const gameStatus = status.completed ? 'Final' : status.state === 'in' ? (status.shortDetail || 'Live') : 'Scheduled'
    const quarters = Array.from({ length: Math.max(sides.home.linescores.length, sides.away.linescores.length) }, (_, index) =>
        `${sides.away.linescores[index]?.value ?? sides.away.linescores[index]?.displayValue ?? '—'} - ${sides.home.linescores[index]?.value ?? sides.home.linescores[index]?.displayValue ?? '—'}`)
    return {
        gameId, source: 'espn', title: `${sides.away.name} — ${sides.home.name}`,
        insight: status.state === 'pre' ? 'Матч ещё не начался. Статистика появится после начала игры.' : `${sides.away.abbr} ${sides.away.score} : ${sides.home.score} ${sides.home.abbr}`,
        storyline: [], quarters, supportsPeriodStats: Boolean(data.plays?.length),
        unavailableStats: ['secondChancePoints'],
        dateUTC, dateMSK,
        meta: {
            homeTeam: sides.home.name, awayTeam: sides.away.name,
            homeAbbr: sides.home.abbr, awayAbbr: sides.away.abbr,
            homeScore: sides.home.score, awayScore: sides.away.score, status: gameStatus,
            homeTeamId: sides.home.teamId, awayTeamId: sides.away.teamId,
            quarters, leadTracker: buildLeadTracker(data.plays), teamStats: { home: sides.home.statistics, away: sides.away.statistics }
        },
        players: { home: sides.home.players, away: sides.away.players },
        venue: data.gameInfo?.venue?.fullName || '',
        attendance: data.gameInfo?.attendance ?? null
    }
}
async function getEspnGame(gameId, periodFilter = null) {
    if (!/^espn:\d+$/.test(gameId)) throw new Error('Invalid game identifier')
    const raw = await fetchWithCache({
        key: `espn-summary-raw-v2:${gameId}`, ttl: 30000,
        fetcher: async () => {
            const { data } = await axios.get('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary', {
                params: { event: gameId.slice(5) }, timeout: 10000
            })
            normalizeSummary(gameId, data) // Validate before caching.
            return data
        }
    })
    const recap = normalizeSummary(gameId, raw)
    if (!periodFilter) return recap
    if (!recap.supportsPeriodStats) throw new Error('Play-by-play is not available for this game yet')
    const { reconstructPeriods, applyPeriod } = require('./periodBoxscore')
    return applyPeriod(recap, reconstructPeriods(raw), periodFilter)
}
module.exports = { getEspnGame, normalizeSummary, normalizeStats, buildLeadTracker }
