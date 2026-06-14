const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')
const fetchWithCache = require('../utils/fetchWithCache')

const router = express.Router()
const PYTHON_URL = 'http://python-backend:8000'

const CONTRACT_LABELS = {
    salaryCap: ['Salary Cap'],
    luxuryTax: ['Luxury Tax'],
    firstApron: ['1st Apron', 'First Apron'],
    secondApron: ['2nd Apron', 'Second Apron'],
    salaryFloor: ['Salary Floor']
}

const TEAM_ABBR = new Set([
    'ATL', 'BOS', 'BRK', 'BKN', 'CHO', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN',
    'DET', 'GSW', 'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN',
    'NOP', 'NOH', 'NYK', 'OKC', 'ORL', 'PHI', 'PHO', 'PHX', 'POR', 'SAC',
    'SAS', 'TOR', 'UTA', 'WAS'
])

const BBREF_TEAM_MAP = {
    BKN: 'BRK',
    CHA: 'CHO',
    PHX: 'PHO'
}

const HOOPSHYPE_TEAM_MAP = {
    ATL: ['atlanta-hawks', '1'],
    BOS: ['boston-celtics', '2'],
    BKN: ['brooklyn-nets', '17'],
    BRK: ['brooklyn-nets', '17'],
    CHA: ['charlotte-hornets', '5312'],
    CHO: ['charlotte-hornets', '5312'],
    CHI: ['chicago-bulls', '4'],
    CLE: ['cleveland-cavaliers', '5'],
    DAL: ['dallas-mavericks', '6'],
    DEN: ['denver-nuggets', '7'],
    DET: ['detroit-pistons', '8'],
    GSW: ['golden-state-warriors', '9'],
    HOU: ['houston-rockets', '10'],
    IND: ['indiana-pacers', '11'],
    LAC: ['los-angeles-clippers', '12'],
    LAL: ['los-angeles-lakers', '13'],
    MEM: ['memphis-grizzlies', '29'],
    MIA: ['miami-heat', '14'],
    MIL: ['milwaukee-bucks', '15'],
    MIN: ['minnesota-timberwolves', '16'],
    NOP: ['new-orleans-pelicans', '3'],
    NYK: ['new-york-knicks', '18'],
    OKC: ['oklahoma-city-thunder', '25'],
    ORL: ['orlando-magic', '19'],
    PHI: ['philadelphia-76ers', '20'],
    PHO: ['phoenix-suns', '21'],
    PHX: ['phoenix-suns', '21'],
    POR: ['portland-trail-blazers', '22'],
    SAC: ['sacramento-kings', '23'],
    SAS: ['san-antonio-spurs', '24'],
    TOR: ['toronto-raptors', '28'],
    UTA: ['utah-jazz', '26'],
    WAS: ['washington-wizards', '27']
}

const NBA_CAP_LINES_2025_26 = {
    salaryCap: { '2025-26': 154_647_000 },
    luxuryTax: { '2025-26': 187_895_000 },
    firstApron: { '2025-26': 195_945_000 },
    secondApron: { '2025-26': 207_824_000 },
    salaryFloor: { '2025-26': 139_182_000 }
}

const FALLBACK_CONTRACTS = {
    BOS: {
        years: ['2025-26'],
        players: [
            ['Jayson Tatum', 27, 54_126_450],
            ['Jaylen Brown', 29, 53_142_264],
            ['Jrue Holiday', 35, 32_400_000],
            ['Kristaps Porzingis', 30, 30_731_707],
            ['Derrick White', 31, 28_100_000],
            ['Sam Hauser', 28, 10_044_644],
            ['Payton Pritchard', 28, 7_232_143],
            ['Baylor Scheierman', 25, 2_619_000],
            ['Xavier Tillman', 26, 2_546_675],
            ['Neemias Queta', 26, 2_349_578],
            ['JD Davison', 23, 2_217_153],
            ['Jordan Walsh', 21, 2_221_677]
        ]
    },
    ATL: {
        years: ['2025-26'],
        players: [
            ['CJ McCollum', 34, 30_666_666],
            ['Jalen Johnson', 24, 30_000_000],
            ['Jonathan Kuminga', 23, 23_799_569],
            ['Nickeil Alexander-Walker', 27, 15_161_800],
            ['Onyeka Okongwu', 25, 15_000_000],
            ['Corey Kispert', 27, 13_975_000],
            ['Zaccharie Risacher', 21, 13_197_720],
            ['Gabe Vincent', 30, 11_500_000],
            ['Buddy Hield', 33, 9_219_512],
            ['Dyson Daniels', 23, 7_707_709, 'player'],
            ['Asa Newell', 20, 3_237_480],
            ['Keaton Wallace', 27, 2_296_274],
            ['Jock Landale', 30, 2_296_274],
            ['Mouhamed Gueye', 23, 2_221_677]
        ]
    }
}

function normalizeTeamAbbr(abbr) {
    const normalized = String(abbr || '').trim().toUpperCase()
    return BBREF_TEAM_MAP[normalized] || normalized
}

function parseMoney(value) {
    const text = String(value || '').replace(/\s+/g, ' ').trim()
    if (!text || text === '-') return null

    const match = text.match(/\$?\s*([\d,]+)/)
    if (!match) return null

    return Number(match[1].replace(/,/g, ''))
}

function getPlayerSalaryTotal(players, year) {
    return players.reduce((sum, player) => sum + (Number(player.salaries?.[year]) || 0), 0)
}

function hasIncompletePlayerRows(data) {
    return (data.years || []).some((year) => {
        const total = Number(data.totalsByYear?.[year]) || 0
        if (!total) return false

        const playersTotal = getPlayerSalaryTotal(data.players || [], year)
        const missing = total - playersTotal

        return missing > 10_000_000 && playersTotal < total * 0.9
    })
}

function assertCompletePlayerRows(data) {
    if (hasIncompletePlayerRows(data)) {
        throw new Error('Contracts player rows are incomplete')
    }

    return data
}

function slugifyPlayer(name) {
    const parts = String(name || '')
        .toLowerCase()
        .replace(/[^a-z\s-]/g, '')
        .split(/\s+/)
        .filter(Boolean)

    if (parts.length < 2) return null

    return `${parts.at(-1)?.slice(0, 5)}${parts[0].slice(0, 2)}01`
}

function normalizePlayerName(name) {
    return String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
}

function extractPlayerSearchRows(data) {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.data)) return data.data

    const resultSet = data?.resultSets?.[0] || data?.resultSet
    const rows = resultSet?.rowSet || []
    const headers = resultSet?.headers || []

    if (!Array.isArray(rows) || !Array.isArray(headers)) return []

    return rows.map(row => Object.fromEntries(headers.map((header, index) => [header, row[index]])))
}

function getSearchPlayerId(player) {
    return player?.PLAYER_ID ?? player?.playerId ?? player?.personId ?? player?.id ?? null
}

function getSearchPlayerName(player) {
    return player?.PLAYER_NAME ?? player?.playerName ?? player?.name ?? ''
}

function getSearchPlayerTeam(player) {
    return player?.TEAM_ABBREVIATION ?? player?.teamAbbreviation ?? player?.team ?? ''
}

async function resolveNbaPlayerId(name, teamAbbr) {
    const query = String(name || '').trim()
    if (!query) return null

    try {
        const data = await fetchWithCache({
            key: `contracts-player-id:v1:${query.toLowerCase()}:${teamAbbr}`,
            ttl: 1000 * 60 * 60 * 24 * 14,
            fetcher: async () => {
                const response = await axios.get(`${PYTHON_URL}/players/search`, {
                    params: { q: query },
                    timeout: 10000
                })

                return response.data
            }
        })

        const rows = extractPlayerSearchRows(data)
        const normalizedQuery = normalizePlayerName(query)
        const exactMatches = rows.filter(row => normalizePlayerName(getSearchPlayerName(row)) === normalizedQuery)
        const teamMatch = exactMatches.find(row => String(getSearchPlayerTeam(row)).toUpperCase() === teamAbbr)
        const match = teamMatch || exactMatches[0] || rows[0]
        const id = getSearchPlayerId(match)

        return id ? String(id) : null
    } catch {
        return null
    }
}

async function enrichContractsWithPlayerIds(data) {
    if (!data?.players?.length) return data

    const players = await Promise.all(data.players.map(async (player) => ({
        ...player,
        nbaPlayerId: player.nbaPlayerId || await resolveNbaPlayerId(player.name, data.teamAbbr)
    })))

    return {
        ...data,
        players
    }
}

function buildFallbackContracts(teamAbbr, reason) {
    const fixture = FALLBACK_CONTRACTS[teamAbbr]
    if (!fixture) return null

    const years = fixture.years
    const totalsByYear = Object.fromEntries(years.map(year => [year, 0]))

    const players = fixture.players.map(([name, age, salary, option]) => {
        const salaries = Object.fromEntries(years.map(year => [year, salary]))
        const options = Object.fromEntries(years.map(year => [year, option || null]))

        years.forEach((year) => {
            totalsByYear[year] += salary
        })

        return {
            name,
            age,
            href: null,
            bbrefSlug: null,
            nbaPlayerId: null,
            salaries,
            options,
            guaranteed: salary
        }
    })

    return {
        source: `https://www.basketball-reference.com/contracts/${teamAbbr}.html`,
        sourceStatus: 'fallback',
        fallbackReason: reason,
        teamAbbr,
        years,
        players,
        totalsByYear,
        caps: NBA_CAP_LINES_2025_26
    }
}

function seasonToLabel(season) {
    const start = Number(season)
    if (!Number.isFinite(start)) return null

    return `${start}-${String(start + 1).slice(-2)}`
}

function findContractsArray(value) {
    if (!value || typeof value !== 'object') return null

    if (Array.isArray(value)) {
        if (value.some(item => item?.__typename === 'Contracts' && Array.isArray(item.seasons))) {
            return value
        }

        for (const item of value) {
            const found = findContractsArray(item)
            if (found) return found
        }

        return null
    }

    for (const item of Object.values(value)) {
        const found = findContractsArray(item)
        if (found) return found
    }

    return null
}

function parseHoopshypeContracts(html, teamAbbr) {
    const $ = cheerio.load(html)
    const nextDataRaw = $('#__NEXT_DATA__').first().text()

    if (!nextDataRaw) {
        throw new Error('Hoopshype data script not found')
    }

    const nextData = JSON.parse(nextDataRaw)
    const contractsRows = findContractsArray(nextData)

    if (!contractsRows?.length) {
        throw new Error('Hoopshype contracts not found')
    }

    const years = [...new Set(
        contractsRows
            .flatMap(player => player.seasons || [])
            .map(season => seasonToLabel(season.season))
            .filter(Boolean)
    )].sort()

    const totalsByYear = Object.fromEntries(years.map(year => [year, 0]))

    const players = contractsRows.map((player) => {
        const salaries = Object.fromEntries(years.map(year => [year, null]))
        const options = Object.fromEntries(years.map(year => [year, null]))

        for (const season of player.seasons || []) {
            const year = seasonToLabel(season.season)
            if (!year || !years.includes(year)) continue

            const salary = Number(season.salary) || null
            salaries[year] = salary
            options[year] = season.playerOption
                ? 'player'
                : season.teamOption
                    ? 'team'
                    : null

            if (salary && !season.teamOption && !season.qualifyingOffer) {
                totalsByYear[year] += salary
            }
        }

        return {
            name: player.playerName,
            age: null,
            href: null,
            bbrefSlug: null,
            hoopshypePlayerId: player.playerID || null,
            nbaPlayerId: null,
            salaries,
            options,
            guaranteed: Object.values(salaries).reduce((sum, salary) => sum + (salary || 0), 0)
        }
    })

    return {
        source: `https://www.hoopshype.com/salaries/${HOOPSHYPE_TEAM_MAP[teamAbbr]?.[0] || teamAbbr}/`,
        sourceStatus: 'hoopshype',
        teamAbbr,
        years,
        players,
        totalsByYear,
        caps: NBA_CAP_LINES_2025_26
    }
}

async function fetchHoopshypeContracts(teamAbbr) {
    const teamPath = HOOPSHYPE_TEAM_MAP[teamAbbr]
    if (!teamPath) {
        throw new Error('Hoopshype team mapping not found')
    }

    const [slug, id] = teamPath
    const url = `https://www.hoopshype.com/salaries/teams/${slug}/${id}/`
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 20000
    })

    return parseHoopshypeContracts(response.data, teamAbbr)
}

function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim()
}

function getOptionType($cell) {
    const text = cleanText($cell.text()).toLowerCase()
    const title = cleanText($cell.attr('title')).toLowerCase()
    const className = cleanText($cell.attr('class')).toLowerCase()
    const descriptor = `${text} ${title} ${className}`

    if (descriptor.includes('player option') || descriptor.includes('player-option') || descriptor.includes('p_opt') || descriptor.includes('p-opt')) {
        return 'player'
    }

    if (descriptor.includes('team option') || descriptor.includes('team-option') || descriptor.includes('t_opt') || descriptor.includes('t-opt')) {
        return 'team'
    }

    return null
}

function getPlayerSlug(href) {
    const match = String(href || '').match(/\/players\/[^/]+\/([^/.]+)\.html/)
    return match?.[1] || null
}

function parseContracts(html, teamAbbr) {
    const withCommentTables = html.replace(/<!--/g, '').replace(/-->/g, '')
    const $ = cheerio.load(withCommentTables)
    const table = $('#contracts').first()

    if (!table.length) {
        throw new Error('Contracts table not found')
    }

    const yearHeaders = []

    table.find('thead tr').last().find('th,td').each((_, cell) => {
        const text = cleanText($(cell).text())
        if (/^\d{4}-\d{2}$/.test(text)) {
            yearHeaders.push({
                label: text,
                stat: $(cell).attr('data-stat') || text
            })
        }
    })

    const caps = {}
    const players = []
    const totalsByYear = Object.fromEntries(yearHeaders.map(year => [year.label, 0]))

    table.find('tbody tr, tfoot tr').each((_, row) => {
        const $row = $(row)
        const header = cleanText($row.find('th').first().text())
        if (!header || header === 'Player') return

        const capKey = Object.entries(CONTRACT_LABELS).find(([, labels]) =>
            labels.some(label => label.toLowerCase() === header.toLowerCase())
        )?.[0]

        if (capKey) {
            caps[capKey] = Object.fromEntries(
                yearHeaders.map((year) => {
                    const value = parseMoney($row.find(`[data-stat="${year.stat}"]`).text())
                    return [year.label, value]
                })
            )
            return
        }

        if (header === 'Team Totals') {
            yearHeaders.forEach((year) => {
                const total = parseMoney($row.find(`[data-stat="${year.stat}"]`).text())
                if (total) {
                    totalsByYear[year.label] = total
                }
            })
            return
        }

        const playerLink = $row.find('th a').first()
        const salaries = {}
        const options = {}

        yearHeaders.forEach((year) => {
            const $cell = $row.find(`[data-stat="${year.stat}"]`).first()
            const salary = parseMoney($cell.text())

            salaries[year.label] = salary
            options[year.label] = salary ? getOptionType($cell) : null

            if (salary) {
                totalsByYear[year.label] += salary
            }
        })

        players.push({
            name: header,
            age: Number(cleanText($row.find('[data-stat="age"]').text())) || null,
            href: playerLink.attr('href') || null,
            bbrefSlug: getPlayerSlug(playerLink.attr('href')),
            nbaPlayerId: null,
            salaries,
            options,
            guaranteed: parseMoney($row.find('[data-stat="remain_gtd"]').text())
        })
    })

    return {
        source: `https://www.basketball-reference.com/contracts/${teamAbbr}.html`,
        teamAbbr,
        years: yearHeaders.map(year => year.label),
        players,
        totalsByYear,
        caps
    }
}

function splitMarkdownRow(row) {
    return row
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(cleanText)
}

function parseMarkdownContracts(markdown, teamAbbr) {
    const lines = String(markdown || '').split('\n')
    const tableStart = lines.findIndex(line => /\|\s*Player\s*\|\s*Age\s*\|/.test(line))

    if (tableStart === -1) {
        throw new Error('Contracts markdown table not found')
    }

    const headers = splitMarkdownRow(lines[tableStart])
    const years = headers.filter(header => /^\d{4}-\d{2}$/.test(header))
    const players = []
    const totalsByYear = Object.fromEntries(years.map(year => [year, 0]))
    const caps = {}

    for (const line of lines.slice(tableStart + 2)) {
        if (!line.trim().startsWith('|')) break

        const cells = splitMarkdownRow(line)
        const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']))
        const rawPlayer = row.Player || ''
        const playerName = cleanText(rawPlayer.replace(/\[([^\]]+)]\([^)]+\)/, '$1').replace(/\*/g, ''))

        if (!playerName || playerName === 'Player') continue

        const capKey = Object.entries(CONTRACT_LABELS).find(([, labels]) =>
            labels.some(label => label.toLowerCase() === playerName.toLowerCase())
        )?.[0]

        if (capKey) {
            caps[capKey] = Object.fromEntries(years.map(year => [year, parseMoney(row[year])]))
            continue
        }

        if (playerName === 'Team Totals') {
            years.forEach((year) => {
                const total = parseMoney(row[year])
                if (total) {
                    totalsByYear[year] = total
                }
            })
            continue
        }

        const href = rawPlayer.match(/\[[^\]]+]\(([^)]+)\)/)?.[1] || null
        const salaries = {}
        const options = {}

        years.forEach((year) => {
            const value = row[year]
            const salary = parseMoney(value)
            const normalizedValue = value.toLowerCase()

            salaries[year] = salary
            options[year] = normalizedValue.includes('player option')
                ? 'player'
                : normalizedValue.includes('team option')
                    ? 'team'
                    : null

            if (salary) {
                totalsByYear[year] += salary
            }
        })

        players.push({
            name: playerName,
            age: Number(row.Age) || null,
            href,
            bbrefSlug: getPlayerSlug(href),
            nbaPlayerId: null,
            salaries,
            options,
            guaranteed: parseMoney(row.Guaranteed)
        })
    }

    return {
        source: `https://www.basketball-reference.com/contracts/${teamAbbr}.html`,
        teamAbbr,
        years,
        players,
        totalsByYear,
        caps
    }
}

router.get('/team-contracts/:abbr', async (req, res) => {
    const teamAbbr = normalizeTeamAbbr(req.params.abbr)

    if (!TEAM_ABBR.has(teamAbbr)) {
        return res.status(400).json({ error: 'Unsupported team abbreviation' })
    }

    try {
        const data = await fetchWithCache({
            key: `team-contracts:hoopshype:v1:${teamAbbr}`,
            ttl: 1000 * 60 * 60 * 6,
            fetcher: async () => {
                try {
                    return await fetchHoopshypeContracts(teamAbbr)
                } catch (error) {
                    const fallback = buildFallbackContracts(teamAbbr, error?.message)
                    if (fallback) return fallback

                    throw error
                }
            }
        })

        res.json(await enrichContractsWithPlayerIds(data))
    } catch (error) {
        console.error('[team-contracts error]', error?.message || error)
        res.status(502).json({
            error: 'Failed to fetch team contracts',
            message: 'Источник контрактов временно недоступен. Попробуйте позже.'
        })
    }
})

module.exports = router
