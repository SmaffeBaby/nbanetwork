// Reconstruct period box scores from the complete, ordered play-by-play.
// Full-game totals remain the provider's official box score.
const STAT_KEYS = ['points', 'fieldGoalsMade', 'fieldGoalsAttempted', 'threePointersMade', 'threePointersAttempted', 'freeThrowsMade', 'freeThrowsAttempted', 'reboundsOffensive', 'reboundsDefensive', 'reboundsTotal', 'assists', 'steals', 'blocks', 'turnovers', 'foulsPersonal', 'minutes', 'plusMinusPoints']
const emptyStats = () => Object.fromEntries(STAT_KEYS.map(key => [key, 0]))
function clockSeconds(value) {
    const parts = String(value || '0').split(':').map(Number)
    return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0]
}
function periodStart(period) { return period <= 4 ? (period - 1) * 720 : 2880 + (period - 5) * 300 }
function reconstructPeriods(data) {
    const players = new Map(), lineups = new Map(), periods = new Map()
    for (const box of data.boxscore?.players || []) {
        const lineup = new Set()
        for (const group of box.statistics || []) for (const row of group.athletes || []) {
            const id = String(row.athlete.id)
            players.set(id, { team: String(box.team.id), name: row.athlete.displayName })
            if (row.starter) lineup.add(id)
        }
        lineups.set(String(box.team.id), lineup)
    }
    const get = (period, id) => {
        if (!players.has(id)) return null
        if (!periods.has(period)) periods.set(period, new Map())
        const map = periods.get(period)
        if (!map.has(id)) map.set(id, emptyStats())
        return map.get(id)
    }
    const add = (period, id, key, value = 1) => { const stats = get(period, id); if (stats) stats[key] += value }
    const homeId = String(data.header?.competitions?.[0]?.competitors?.find(team => team.homeAway === 'home')?.id)
    let lastTime = 0, lastHome = 0, lastAway = 0
    const foulKeys = new Set()
    const plays = [...(data.plays || [])].sort((a,b) => Number(a.sequenceNumber) - Number(b.sequenceNumber))
    for (const play of plays) {
        const period = Number(play.period?.number || 1)
        const elapsed = periodStart(period) + (period <= 4 ? 720 : 300) - clockSeconds(play.clock?.displayValue)
        // Split stints at period boundaries, including five-minute overtimes.
        let cursor = lastTime
        while (cursor < elapsed) {
            const q = cursor < 2880 ? Math.floor(cursor / 720) + 1 : Math.floor((cursor - 2880) / 300) + 5
            const end = Math.min(elapsed, periodStart(q) + (q <= 4 ? 720 : 300))
            for (const lineup of lineups.values()) for (const id of lineup) add(q, id, 'minutes', (end - cursor) / 60)
            cursor = end
        }
        lastTime = Math.max(lastTime, elapsed)
        const type = play.type?.text || '', text = play.text || ''
        const ids = (play.participants || []).map(item => String(item.athlete.id))
        const actor = ids[0], other = ids[1]
        const shot = play.shootingPlay || /free throw/i.test(type)
        if (shot && actor) {
            const ft = /free throw/i.test(type)
            const points = ft ? 1 : Number(play.pointsAttempted || (/three point/i.test(text) ? 3 : 2))
            add(period, actor, ft ? 'freeThrowsAttempted' : 'fieldGoalsAttempted')
            if (!ft && points === 3) add(period, actor, 'threePointersAttempted')
            if (play.scoringPlay) {
                add(period, actor, 'points', Number(play.scoreValue || points))
                add(period, actor, ft ? 'freeThrowsMade' : 'fieldGoalsMade')
                if (!ft && points === 3) add(period, actor, 'threePointersMade')
                if (!ft && /assists/i.test(text)) add(period, other, 'assists')
            }
            if (/blocks/i.test(text)) add(period, other, 'blocks')
        }
        if (/^(Offensive|Defensive) Rebound$/i.test(type) && actor) {
            add(period, actor, /Offensive/.test(type) ? 'reboundsOffensive' : 'reboundsDefensive')
            add(period, actor, 'reboundsTotal')
        }
        if (/turnover/i.test(type + ' ' + text)) {
            add(period, actor, 'turnovers')
            if (/steals/i.test(text)) add(period, other, 'steals')
        }
        if (/foul/i.test(type) && !/technical/i.test(type)) {
            const foulKey = `${actor}:${period}:${play.clock?.displayValue}`
            if (!/turnover/i.test(type) || !foulKeys.has(foulKey)) add(period, actor, 'foulsPersonal')
            foulKeys.add(foulKey)
        }
        const homeScore = Number(play.homeScore), awayScore = Number(play.awayScore)
        if (Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
            const delta = (homeScore - lastHome) - (awayScore - lastAway)
            if (delta) for (const [team, lineup] of lineups) for (const id of lineup) add(period, id, 'plusMinusPoints', team === homeId ? delta : -delta)
            lastHome = homeScore; lastAway = awayScore
        }
        if (/Substitution/i.test(type)) {
            const lineup = lineups.get(String(play.team?.id))
            if (lineup && ids.length === 2) { lineup.delete(other); lineup.add(actor) }
        }
    }
    return periods
}
function applyPeriod(recap, periods, filter) {
    const result = structuredClone(recap)
    result.periodFilter = filter.key
    result.periodNotice = 'Данные восстановлены по протоколу игры. Минуты и +/- по четвертям недоступны; показатели с расхождениями в протоколе отмечены прочерком.'
    for (const side of ['home', 'away']) {
        result.players[side] = result.players[side].map(player => {
            const stats = emptyStats(), id = player.personId.replace(/^espn:/, '')
            for (let q = filter.startPeriod; q <= filter.endPeriod; q++) {
                const row = periods.get(q)?.get(id)
                if (row) for (const key of STAT_KEYS) stats[key] += row[key]
            }
            const included = stats.minutes > 0 || Object.entries(stats).some(([key,value]) => key !== 'plusMinusPoints' && value > 0)
            const unavailableStats = ['minutes', 'plusMinus']
            const fields = {
                points:['points','tsPct','gameScore'], fieldGoalsMade:['fgM','fgMiss','fgPct','twoM','twoPct','efgPct','tsPct','gameScore'],
                fieldGoalsAttempted:['fgA','fgMiss','fgPct','twoA','twoPct','efgPct','tsPct','gameScore'], threePointersMade:['tpM','tpPct','twoM','twoPct','efgPct'],
                threePointersAttempted:['tpA','tpPct','twoA','twoPct'], freeThrowsMade:['ftM','ftMiss','ftPct','tsPct','gameScore'], freeThrowsAttempted:['ftA','ftMiss','ftPct','tsPct','gameScore'],
                reboundsTotal:['rebounds'], reboundsOffensive:['offensiveRebounds','gameScore'], reboundsDefensive:['defensiveRebounds','gameScore'],
                assists:['assists','gameScore'], steals:['steals','gameScore'], blocks:['blocks','gameScore'], turnovers:['turnovers','gameScore'], foulsPersonal:['fouls','gameScore']
            }
            for (const [key, affected] of Object.entries(fields)) {
                const sum = [...periods.values()].reduce((total, rows) => total + (rows.get(id)?.[key] || 0), 0)
                if (player.statistics[key] !== undefined && sum !== player.statistics[key]) { unavailableStats.push(...affected); stats[key] = null }
            }
            stats.minutes = null
            stats.plusMinusPoints = null
            return { ...player, statistics: stats, unavailableStats: [...new Set(unavailableStats)], _included: included }
        }).filter(player => !player.notPlayingReason && player._included).map(({ _included, ...player }) => player)
    }
    return result
}
module.exports = { reconstructPeriods, applyPeriod, clockSeconds, STAT_KEYS }
