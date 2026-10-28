const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C']
const DAY = 86400000
function weekAt(now = new Date()) {
    const local = new Date(+now + 3 * 3600000)
    const monday = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - (local.getUTCDay() + 6) % 7) - 3 * 3600000
    return { id: new Date(monday + 3 * 3600000).toISOString().slice(0, 10), start: new Date(monday).toISOString(), end: new Date(monday + 6 * DAY + 20 * 3600000).toISOString(), next: new Date(monday + 7 * DAY).toISOString() }
}
function positions(value) {
    return ({ G: ['PG', 'SG'], F: ['SF', 'PF'], 'G-F': ['SG', 'SF'], 'F-C': ['PF', 'C'] })[value] || (POSITIONS.includes(value) ? [value] : [])
}
function score(s, won = false) {
    const n = key => Number.isFinite(Number(s[key])) ? Number(s[key]) : 0
    const doubles = ['points', 'reboundsTotal', 'assists', 'steals', 'blocks'].filter(k => n(k) >= 10).length
    return Math.round((n('points') + 1.2 * n('reboundsTotal') + 1.5 * n('assists') + 3 * (n('steals') + n('blocks')) - n('turnovers') - .5 * Math.max(0, n('fieldGoalsAttempted') - n('fieldGoalsMade')) - Math.max(0, n('freeThrowsAttempted') - n('freeThrowsMade')) + (won ? 3 : 0) + (doubles >= 3 ? 6 : doubles >= 2 ? 3 : 0)) * 10) / 10
}
function validateLineup(lineup, catalog) {
    if (!Array.isArray(lineup) || lineup.length !== 5 || new Set(lineup.map(p => p?.id)).size !== 5 || new Set(lineup.map(p => p?.slot)).size !== 5) throw new Error('Выберите пять разных игроков: PG, SG, SF, PF и C')
    return POSITIONS.map(slot => {
        const choice = lineup.find(p => p?.slot === slot)
        const player = catalog.find(p => p.id === choice?.id)
        if (!player || !player.positions.includes(slot) || player.injury || player.remaining < 1) throw new Error('Состав устарел: проверьте позиции, травмы и оставшиеся матчи')
        return { id: player.id, name: player.name, team: player.team, slot }
    })
}
module.exports = { POSITIONS, DAY, weekAt, positions, score, validateLineup }
