const { getAdmin } = require('../../lib/supabase')
const { getEspnGame } = require('../espnGameService')
const { weekAt, score } = require('./rules')
const { schedule } = require('./data')
let running = false
async function syncFantasy() {
    if (running) return
    running = true
    try {
        const week = weekAt()
        if (Date.now() >= Date.parse(week.end)) return
        const db = getAdmin()
        const { data: entries, error } = await db.from('fantasy_entries').select('confirmed_at').eq('week', week.id).order('confirmed_at').limit(1)
        if (error) throw error
        if (!entries?.length) return
        const { data: existing, error: readError } = await db.from('fantasy_scores').select('game_id').eq('week', week.id)
        if (readError) throw readError
        const done = new Set((existing || []).map(s => s.game_id))
        const games = (await schedule(week)).filter(g => g.completed && Date.parse(g.start) >= Date.parse(entries[0].confirmed_at) && !done.has(`espn:${g.id}`))
        for (const game of games) {
            if (Date.now() >= Date.parse(week.end)) break
            const result = await getEspnGame(`espn:${game.id}`)
            if (result.meta.status !== 'Final') continue
            const rows = []
            for (const side of ['home', 'away']) for (const p of result.players[side]) {
                if (p.notPlayingReason || !(p.statistics.minutes > 0)) continue
                const won = side === 'home' ? result.meta.homeScore > result.meta.awayScore : result.meta.awayScore > result.meta.homeScore
                rows.push({ week: week.id, game_id: `espn:${game.id}`, player_id: p.personId.replace('espn:', ''), starts_at: game.start, observed_at: new Date().toISOString(), points: score(p.statistics, won), stats: { ...p.statistics, won, homeAbbr:result.meta.homeAbbr, awayAbbr:result.meta.awayAbbr } })
            }
            if (rows.length) {
                const { error: writeError } = await db.from('fantasy_scores').upsert(rows, { onConflict: 'week,game_id,player_id' })
                if (writeError) throw writeError
            }
        }
    } finally { running = false }
}
function startFantasyMaintenance() {
    const tick = () => syncFantasy().catch(error => console.warn('Fantasy maintenance:', error.message))
    void tick()
    setInterval(tick, 60000).unref()
}
module.exports = { syncFantasy, startFantasyMaintenance }
