// Import HTML exported from the public HoopsHype UI, or refresh with normal HTTP.
// Usage: node scripts/import-contracts.js --directory /path/to/exports
//        node scripts/import-contracts.js --team HOU --from 1990 --to 2026
const fs = require('node:fs/promises')
const path = require('node:path')
const { parseHoopshype, splitSeasons, canonicalTeam } = require('../services/contracts/parser')
const { saveSeasons } = require('../services/contracts/repository')
const { refreshTeam, currentSeason } = require('../services/contracts/service')
const TEAMS = require('../services/contracts/teams')
async function main() {
    const args = process.argv.slice(2)
    const option = name => args[args.indexOf(name) + 1]
    if (args.includes('--directory')) {
        const directory = option('--directory')
        let count = 0, failures = 0
        for (const file of (await fs.readdir(directory)).filter(file => file.endsWith('.json')).sort()) {
            const pages = JSON.parse(await fs.readFile(path.join(directory, file), 'utf8'))
            const grouped = new Map()
            for (const page of Array.isArray(pages) ? pages : [pages]) {
                try {
                    const parsed = parseHoopshype(page.html, page.team, page.season)
                    const rows = grouped.get(parsed.teamAbbr) || []
                    grouped.set(parsed.teamAbbr, [...rows, ...splitSeasons(parsed)])
                } catch (error) { failures++; console.error(`${file} ${page.season}: ${error.message}`) }
            }
            for (const [team, rows] of grouped) {
                const saved = await saveSeasons(rows); count += saved
                console.log(JSON.stringify({ file, team, saved }))
            }
        }
        console.log(JSON.stringify({ savedSeasons: count, invalidPages: failures }))
        if (failures) process.exitCode = 1
        return
    }
    const teams = args.includes('--team') ? [canonicalTeam(option('--team'))] : [...new Set(Object.keys(TEAMS).map(canonicalTeam))]
    const from = args.includes('--from') ? Number(option('--from')) : Number(currentSeason().slice(0, 4))
    const to = args.includes('--to') ? Number(option('--to')) : Number(currentSeason().slice(0, 4))
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1946 || from > to || to > 2200) throw new Error('Invalid year range')
    for (const team of teams) for (let year = to; year >= from; year--) {
        await refreshTeam(team, `${year}-${String(year + 1).slice(-2)}`)
        console.log(`${team} ${year}: imported`)
        await new Promise(resolve => setTimeout(resolve, 1000))
    }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
