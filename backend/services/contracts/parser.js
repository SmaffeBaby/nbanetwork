const cheerio = require('cheerio')
const TEAMS = require('./teams')

const canonicalTeam = value => ({ BRK: 'BKN', CHO: 'CHA', PHO: 'PHX', NOH: 'NOP' }[String(value).toUpperCase()] || String(value).toUpperCase())
function seasonLabel(value) {
    const match = String(value ?? '').trim().match(/^(\d{4})(?:[-/](\d{2}|\d{4}))?$/)
    if (!match) return null
    const year = Number(match[1])
    if (year < 1946 || year > 2200) return null
    if (match[2] && match[2].slice(-2) !== String(year + 1).slice(-2)) return null
    return `${year}-${String(year + 1).slice(-2)}`
}
function money(value) {
    if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null
    const clean = String(value ?? '').replace(/\s+/g, '').replace(/^\$/, '').replace(/,/g, '')
    return /^\d+$/.test(clean) ? Number(clean) : null
}
function sourceUrl(team, season) {
    const entry = TEAMS[canonicalTeam(team)]
    if (!entry) throw new Error('Unknown team')
    return `https://eu.hoopshype.com/salaries/teams/${entry[0]}/${entry[1]}/?season=${Number(season.slice(0, 4))}`
}
function validate(payload) {
    if (!payload.years.length || !payload.players.length) throw new Error('HoopsHype salary table is empty or unavailable')
    for (const player of payload.players) {
        if (!player.name || !Object.values(player.salaries).some(value => value !== null)) throw new Error('Invalid salary row')
    }
    return payload
}
function findContracts(value) {
    if (!value || typeof value !== 'object') return null
    if (Array.isArray(value) && value.some(row => row?.playerName && Array.isArray(row.seasons))) return value
    for (const child of Object.values(value)) { const found = findContracts(child); if (found) return found }
    return null
}
function parseNextData($) {
    const script = $('#__NEXT_DATA__').text()
    if (!script) return null
    const rows = findContracts(JSON.parse(script))
    if (!rows?.length) return null
    const years = [...new Set(rows.flatMap(row => row.seasons.map(item => seasonLabel(item.season))).filter(Boolean))].sort()
    const totalsByYear = Object.fromEntries(years.map(year => [year, 0]))
    const players = rows.filter(row => row.playerName).map(row => {
        const salaries = {}, options = {}, qualifyingOffers = {}, twoWay = {}
        for (const item of row.seasons) {
            const year = seasonLabel(item.season)
            if (!year) continue
            salaries[year] = money(item.salary)
            options[year] = item.playerOption ? 'player' : item.teamOption ? 'team' : null
            qualifyingOffers[year] = Boolean(item.qualifyingOffer)
            twoWay[year] = Boolean(item.twoWay)
            if (!item.teamOption && !item.qualifyingOffer) totalsByYear[year] += salaries[year] ?? 0
        }
        return { name: row.playerName, hoopshypePlayerId: row.playerID || null, href: null, age: null, nbaPlayerId: null, bbrefSlug: null, guaranteed: null, salaries, options, qualifyingOffers, twoWay }
    })
    return { years, players, totalsByYear, caps: {} }
}
function parseHoopshype(html, team, selectedSeason) {
    team = canonicalTeam(team)
    if (!TEAMS[team]) throw new Error('Unknown team')
    selectedSeason = seasonLabel(selectedSeason)
    if (!selectedSeason) throw new Error('Invalid season')
    const $ = cheerio.load(html)
    let parsed
    $('table').each((_, table) => {
        if (parsed) return
        const header = $(table).find('thead tr').first().find('th,td').toArray().map(cell => $(cell).text().trim())
        const columns = header.map((label, index) => ({ year: seasonLabel(label), index })).filter(item => item.year)
        if (!columns.length || !header.some(label => /player/i.test(label))) return
        const years = columns.map(item => item.year), players = [], totalsByYear = {}
        $(table).find('tbody tr,tfoot tr').each((_, tr) => {
            const cells = $(tr).find('td,th').toArray()
            const name = $(cells[0]).text().replace(/\s+/g, ' ').trim()
            if (!name) return
            const salaries = {}, options = {}, qualifyingOffers = {}, twoWay = {}
            for (const { year, index } of columns) {
                const cell = $(cells[index])
                const option = cell.find('sup').text().trim()
                const copy = cell.clone(); copy.find('sup').remove()
                salaries[year] = money(copy.text())
                const descriptor = `${option} ${cell.attr('title') || ''} ${cell.attr('class') || ''}`.toLowerCase()
                options[year] = option === 'P' || descriptor.includes('player option') ? 'player' : option === 'T' || descriptor.includes('team option') ? 'team' : null
                qualifyingOffers[year] = option === 'Q'
                twoWay[year] = option === 'TW'
            }
            if (/^(team )?totals?$/i.test(name)) {
                for (const year of years) if (salaries[year] !== null) totalsByYear[year] = salaries[year]
                return
            }
            if (!Object.values(salaries).some(value => value !== null)) return
            const href = $(cells[0]).find('a').attr('href')
            players.push({ name, href: href ? new URL(href, 'https://eu.hoopshype.com').href : null,
                hoopshypePlayerId: href?.match(/\/(\d+)\/?$/)?.[1] || null,
                nbaPlayerId: null, bbrefSlug: null, age: null, guaranteed: null, salaries, options, qualifyingOffers, twoWay })
        })
        for (const year of years) {
            if (totalsByYear[year] === undefined) totalsByYear[year] = players.reduce((sum, player) => sum + (!player.qualifyingOffers[year] && player.options[year] !== 'team' ? player.salaries[year] ?? 0 : 0), 0)
        }
        parsed = { years, players, totalsByYear, caps: {} }
    })
    parsed ??= parseNextData($)
    if (!parsed) throw new Error('HoopsHype did not return a salary table (access may be restricted)')
    if (!parsed.years.includes(selectedSeason)) throw new Error(`Source returned another season instead of ${selectedSeason}`)
    return validate({ ...parsed, teamAbbr: team, source: sourceUrl(team, selectedSeason), sourceSeason: selectedSeason, sourceStatus: 'hoopshype' })
}
function splitSeasons(parsed) {
    // Archive pages own only their selected year; the current page may also own future projections.
    return parsed.years.filter(year => year >= parsed.sourceSeason).map(season => ({
        team_abbr: parsed.teamAbbr, season, source_season: parsed.sourceSeason, source_url: parsed.source,
        fetched_at: new Date().toISOString(),
        payload: { years: [season], players: parsed.players.filter(player => player.salaries[season] !== null && player.salaries[season] !== undefined).map(player => ({
            ...player, salaries: { [season]: player.salaries[season] }, options: { [season]: player.options[season] ?? null },
            qualifyingOffers: { [season]: Boolean(player.qualifyingOffers?.[season]) }, twoWay: { [season]: Boolean(player.twoWay?.[season]) }
        })), totalsByYear: { [season]: parsed.totalsByYear[season] }, caps: parsed.caps }
    })).filter(row => row.payload.players.length)
}
module.exports = { canonicalTeam, seasonLabel, money, sourceUrl, parseHoopshype, splitSeasons }
