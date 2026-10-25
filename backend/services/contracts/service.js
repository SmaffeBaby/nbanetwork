const axios = require('axios')
const fs = require('node:fs/promises')
const path = require('node:path')
const { canonicalTeam, seasonLabel, sourceUrl, parseHoopshype, splitSeasons } = require('./parser')
const { readSeasons, saveSeasons, combineSeasons } = require('./repository')
const TEAMS = require('./teams')
const pending = new Map(), retryAfter = new Map()
const currentSeason = () => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Moscow', year: 'numeric', month: 'numeric' }).formatToParts(new Date())
    const year = Number(parts.find(p => p.type === 'year').value) - (Number(parts.find(p => p.type === 'month').value) < 10 ? 1 : 0)
    return `${year}-${String(year + 1).slice(-2)}`
}
async function refreshTeam(team, season = currentSeason()) {
    team = canonicalTeam(team); season = seasonLabel(season)
    if (!TEAMS[team] || !season) throw new Error('Invalid team or season')
    const key = `${team}:${season}`
    if (pending.has(key)) return pending.get(key)
    if (Date.now() < (retryAfter.get(key) || 0)) throw new Error('HoopsHype temporarily unavailable')
    const request = (async () => {
        try {
            const response = await axios.get(sourceUrl(team, season), { timeout: 20000,
                headers: { 'User-Agent': 'NBA-dashboard-contracts/1.0', Accept: 'text/html' }, maxContentLength: 10 * 1024 * 1024 })
            const parsed = parseHoopshype(response.data, team, season)
            await saveSeasons(splitSeasons(parsed))
            retryAfter.delete(key)
        } catch (error) {
            retryAfter.set(key, Date.now() + 15 * 60_000)
            throw error
        } finally { pending.delete(key) }
    })()
    pending.set(key, request)
    return request
}
async function getTeamContracts(team) {
    team = canonicalTeam(team)
    if (!TEAMS[team]) throw new Error('Unknown team')
    const season = currentSeason()
    let rows = await readSeasons(team)
    const current = rows.find(row => row.season === season)
    let stale = !current || Date.now() - Date.parse(current.fetched_at) > 6 * 60 * 60_000
    if (stale && !process.env.CONTRACT_IMPORT_DIR) {
        if (rows.length) {
            void refreshTeam(team, season).catch(error => console.warn(`HoopsHype refresh ${team}: ${error.message}`))
        } else {
            await refreshTeam(team, season)
            rows = await readSeasons(team)
            stale = false
        }
    }
    const data = combineSeasons(rows, team, season)
    if (!data) throw new Error('No imported HoopsHype data')
    let importRunning = false
    if (process.env.CONTRACT_IMPORT_DIR) {
        try {
            const status = JSON.parse(await fs.readFile(path.join(process.env.CONTRACT_IMPORT_DIR, '..', 'status.json'), 'utf8'))
            importRunning = status.running === true && Date.now() - Date.parse(status.updatedAt) < 15 * 60_000
        } catch { /* Status is optional; saved data remains available. */ }
    }
    return { ...data, stale, archive: { firstSeason: rows[0]?.season, importedSeasons: rows.length, importRunning } }
}
module.exports = { currentSeason, getTeamContracts, refreshTeam }
