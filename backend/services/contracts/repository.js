const { getAdmin } = require('../../lib/supabase')
const { canonicalTeam } = require('./parser')
const TABLE = 'nba_team_contract_seasons'
async function readSeasons(team) {
    const { data, error } = await getAdmin().from(TABLE)
        .select('team_abbr,season,source_url,source_season,payload,fetched_at')
        .eq('team_abbr', canonicalTeam(team)).order('season')
        .abortSignal(AbortSignal.timeout(5000))
    if (error) throw error
    return data || []
}
async function saveSeasons(rows) {
    if (!rows.length) return 0
    const existing = await readSeasons(rows[0].team_abbr)
    const bySeason = new Map(existing.map(row => [row.season, row]))
    const selected = new Map()
    for (const row of rows) {
        const previous = selected.get(row.season) || bySeason.get(row.season)
        if (!previous || row.source_season >= previous.source_season) selected.set(row.season, row)
    }
    const values = [...selected.values()]
    if (!values.length) return 0
    const { error } = await getAdmin().from(TABLE).upsert(values, { onConflict: 'team_abbr,season' })
        .abortSignal(AbortSignal.timeout(15000))
    if (error) throw error
    return values.length
}
function combineSeasons(rows, team, currentSeason) {
    if (!rows.length) return null
    const years = rows.map(row => row.season).sort()
    const players = new Map(), totalsByYear = {}, caps = {}, sourcesByYear = {}, fetchedAtByYear = {}
    for (const row of rows) {
        const year = row.season
        sourcesByYear[year] = row.source_url
        fetchedAtByYear[year] = row.fetched_at
        totalsByYear[year] = row.payload.totalsByYear[year]
        for (const [key, values] of Object.entries(row.payload.caps || {})) {
            caps[key] ??= {}; if (values[year] != null) caps[key][year] = values[year]
        }
        for (const player of row.payload.players) {
            const key = String(player.hoopshypePlayerId || player.href || player.name.toLowerCase())
            const combined = players.get(key) || { ...player, salaries: {}, options: {}, qualifyingOffers: {}, twoWay: {} }
            combined.salaries[year] = player.salaries[year]
            combined.options[year] = player.options[year] ?? null
            combined.qualifyingOffers[year] = Boolean(player.qualifyingOffers?.[year])
            combined.twoWay[year] = Boolean(player.twoWay?.[year])
            players.set(key, combined)
        }
    }
    const selected = years.includes(currentSeason) ? currentSeason : years.at(-1)
    return { teamAbbr: canonicalTeam(team), source: sourcesByYear[selected], sourceStatus: 'hoopshype',
        years: years.reverse(), players: [...players.values()], totalsByYear, caps, sourcesByYear, fetchedAtByYear,
        fetchedAt: fetchedAtByYear[selected], storage: 'supabase' }
}
module.exports = { readSeasons, saveSeasons, combineSeasons }
