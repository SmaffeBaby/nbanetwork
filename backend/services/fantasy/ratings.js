// Statistical season OVR v1. Original model, not an NBA 2K rating.
const { normalizeRow } = require('./seasonStats')
const clamp = (x, min, max) => Math.max(min, Math.min(max, x))
function seasonYear(date) {
    const d = new Date(`${date}T12:00:00Z`)
    return d.getUTCFullYear() + (d.getUTCMonth() >= 6 ? 1 : 0)
}
function rateSeason(data) {
    const rows = data.athletes.map(row => ({ ...normalizeRow(row, data.categories), position: row.athlete.position?.abbreviation || row.athlete.position || '' }))
    const eligible = rows.filter(p => p.stats.gamesPlayed > 0 && p.stats.avgMinutes > 0)
    const role = position => /^(PG|SG|G)$/.test(position) ? 'guard' : /^(PF|C|F-C)$/.test(position) ? 'big' : 'wing'
    const n = (s, key) => Number.isFinite(s[key]) ? s[key] : 0
    function metrics(s) {
        const gp = n(s,'gamesPlayed'), pts = n(s,'avgPoints'), ast = n(s,'avgAssists'), to = n(s,'avgTurnovers')
        const fga = n(s,'avgFieldGoalsAttempted'), fta = n(s,'avgFreeThrowsAttempted')
        // Bayesian TS with 50 shooting possessions at a neutral .57 prior.
        const attempts = gp * (fga + .44 * fta)
        const ts = (gp * pts / 2 + 50 * .57) / (attempts + 50)
        return [pts, n(s,'avgMinutes'), clamp(ts,0,1), ast - .8*to, n(s,'avgRebounds'), n(s,'avgSteals') + n(s,'avgBlocks')]
    }
    const all = eligible.map(p => ({ ...p, role: role(p.position), values: metrics(p.stats) }))
    const percentile = (v, values) => values.length < 2 ? .5 : (values.filter(x=>x<v).length + .5*(values.filter(x=>x===v).length-1))/(values.length-1)
    const weights = [.25,.10,.20,.20,.15,.10]
    return Object.fromEntries(all.map(p => {
        const peers = all.filter(x=>x.role===p.role)
        const group = peers.length >= 10 ? peers : all
        const parts = p.values.map((v,i)=>percentile(v,group.map(x=>x.values[i])))
        const composite = parts.reduce((sum,v,i)=>sum+v*weights[i],0)
        const minutes = p.stats.gamesPlayed*p.stats.avgMinutes
        const confidence = minutes/(minutes+150)
        const ovr = clamp(Math.round(60+39*(.5+confidence*(composite-.5))),60,99)
        return [p.id,{ovr,gamesPlayed:p.stats.gamesPlayed,confidence:Math.round(confidence*100),components:parts.map(v=>Math.round(v*100))}]
    }))
}
module.exports = { rateSeason, seasonYear }
