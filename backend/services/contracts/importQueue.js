const fs = require('node:fs/promises')
const path = require('node:path')
const { parseHoopshype, splitSeasons } = require('./parser')
const { saveSeasons } = require('./repository')
function startImportQueue() {
    const root = process.env.CONTRACT_IMPORT_DIR
    if (!root) return
    const processed = new Map()
    let running = false
    async function scan() {
        if (running) return
        running = true
        try {
            const files = (await fs.readdir(root)).filter(file => /^[A-Z]{3}\.json$/.test(file))
            for (const file of files) {
                try {
                    const location = path.join(root, file)
                    const stat = await fs.stat(location)
                    if (stat.size > 15 * 1024 * 1024 || processed.get(file) === stat.mtimeMs) continue
                    const pages = JSON.parse(await fs.readFile(location, 'utf8'))
                    if (!Array.isArray(pages)) throw new Error('Invalid import file')
                    const rows = pages.flatMap(page => {
                        const parsed = parseHoopshype(page.html, page.team, page.season)
                        if (`${parsed.teamAbbr}.json` !== file) throw new Error('Wrong team in import file')
                        return splitSeasons(parsed).map(row => ({ ...row,
                            ...(page.fetchedAt && Number.isFinite(Date.parse(page.fetchedAt)) && Date.parse(page.fetchedAt) <= Date.now() + 300000
                                ? { fetched_at: new Date(page.fetchedAt).toISOString() } : {})
                        }))
                    })
                    const saved = await saveSeasons(rows)
                    processed.set(file, stat.mtimeMs)
                    console.log(JSON.stringify({ contractsImported: file, seasons: saved }))
                } catch (error) { console.warn(`Contracts import ${file}:`, error.message) }
            }
        } catch (error) { console.warn('Contracts import queue:', error.message) }
        finally { running = false }
    }
    void scan()
    const timer = setInterval(() => { void scan() }, 15000)
    timer.unref()
}
module.exports = { startImportQueue }
