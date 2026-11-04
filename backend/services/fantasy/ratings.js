const fetchWithCache = require('../../utils/fetchWithCache')
const { normalizeRow } = require('./seasonStats')
const RATING_VERSION = 3
const clamp = (x, min, max) => Math.max(min, Math.min(max, x))
function seasonYear(date) {
    const d = new Date(`${date}T12:00:00Z`)
    return d.getUTCFullYear() + (d.getUTCMonth() >= 6 ? 1 : 0)
}
function seasonRows(data) {
    return data.athletes.map(row => ({ ...normalizeRow(row, data.categories), position: row.athlete.position?.abbreviation || row.athlete.position || '' }))
}

function seasonRatings(year) {
    const { seasonAthletes } = require('../gamePreview')
    return fetchWithCache({ key: `fantasy-ovr-v${RATING_VERSION}:${year}`, ttl: 15 * 60000, fetcher: async () => {
        const [current, previous] = await Promise.all([seasonAthletes(year, 2), seasonAthletes(year - 1, 2)])
        return rateRows(seasonRows(current), rateSeason(previous))
    } })
}

// Preserve the original seasonal model as the baseline for the prior year.
function rateSeason(data) {
    return seasonPerformance(seasonRows(data))
}

function seasonPerformance(rows, onlyId = null) {
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
    return Object.fromEntries(all.filter(p=>onlyId===null || p.id===onlyId).map(p => {
        const peers = all.filter(x=>x.role===p.role)
        const group = peers.length >= 10 ? peers : all
        const parts = p.values.map((v,i)=>percentile(v,group.map(x=>x.values[i])))
        const composite = parts.reduce((sum,v,i)=>sum+v*weights[i],0)
        const minutes = p.stats.gamesPlayed*p.stats.avgMinutes
        const confidence = minutes/(minutes+150)
        const ovr = Math.round(60 + 39 * (.5 + confidence * (composite - .5)))
        return [p.id, {
            ovr, composite, minutes, avgMinutes:p.stats.avgMinutes,
            gamesPlayed:p.stats.gamesPlayed, components:parts.map(v=>Math.round(v*100))
        }]
    }))
}

function calibratedOvr(strength) {
    // Linear interpolation gives elite production more space between 90 and 97.
    const anchors = [[0,60],[.5,80],[.7,85],[.8,91],[.875,97],[1,99]]
    const index = anchors.findIndex(([threshold]) => threshold >= strength)
    if (index <= 0) return index === 0 ? 60 : 99
    const [low, min] = anchors[index - 1]
    const [high, max] = anchors[index]
    return Math.round(min + (max - min) * (strength - low) / (high - low))
}

function rateRows(rows, previous, onlyId = null) {
    const current = seasonPerformance(rows, onlyId)
    const ids = onlyId === null ? new Set([...Object.keys(current), ...Object.keys(previous)]) : [onlyId]
    return Object.fromEntries([...ids].flatMap(id => {
        const now = current[id], prior = previous[id]
        if (!now && !prior) return []
        const minutes = now?.minutes ?? 0
        const priorMinutes = prior ? 360 * prior.minutes / (prior.minutes + 300) : 0
        const totalWeight = 150 + minutes + priorMinutes
        const evidence = 75 + minutes * (now?.composite ?? .5) + priorMinutes * (prior?.composite ?? .5)
        const ovr = calibratedOvr(evidence / totalWeight)
        // Project about 12 appearances at the current pace, discounting sparse samples.
        const projectedMinutes = now ? 12 * now.avgMinutes * Math.min(1, now.gamesPlayed / 8) : 0
        const projectedOvr = now ? calibratedOvr((evidence + projectedMinutes * now.composite) / (totalWeight + projectedMinutes)) : null
        return [[id, {
            version:RATING_VERSION, ovr, projectedOvr, previousOvr:prior?.ovr ?? null, gamesPlayed:now?.gamesPlayed ?? 0,
            confidence:Math.round(100 * minutes / totalWeight), components:now?.components ?? []
        }]]
    }))
}
module.exports = { rateSeason, rateRows, seasonYear, seasonRatings, RATING_VERSION }
