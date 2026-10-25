const { chromium } = require('playwright')
const fs = require('node:fs/promises')
const path = require('node:path')
const TEAMS = require('./teams')
const ROOT = process.env.CONTRACT_DATA_DIR || '/data'
const INTERVAL = 6 * 60 * 60_000
const teams = Object.entries(TEAMS).filter(([team]) => !['BRK', 'CHO', 'PHO'].includes(team))
const status = { running: false, processedPages: 0, failures: [], updatedAt: null }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function atomic(file, value) {
    const temporary = `${file}.${process.pid}.tmp`
    await fs.writeFile(temporary, JSON.stringify(value))
    await fs.rename(temporary, file)
}
async function record(extra) {
    Object.assign(status, extra, { updatedAt: new Date().toISOString() })
    await atomic(path.join(ROOT, 'status.json'), status)
}
function currentSeason() {
    const now = new Date(), values = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Moscow', year: 'numeric', month: 'numeric' }).formatToParts(now).map(p => [p.type, p.value]))
    const year = Number(values.year) - (Number(values.month) < 10 ? 1 : 0)
    return `${year}-${String(year + 1).slice(-2)}`
}
async function readTable(page, expectedSeason) {
    const table = page.getByRole('table').filter({ has: page.getByText(expectedSeason, { exact: true }) }).first()
    await table.waitFor({ state: 'visible', timeout: 15000 })
    await table.locator('tbody tr').first().waitFor({ state: 'visible', timeout: 10000 })
    const html = await table.evaluate(element => element.outerHTML)
    if (!/\$/.test(html)) throw new Error('No salary rows for this season')
    return html
}
async function run(browser) {
    await record({ running: true, failures: [], cycleStartedAt: new Date().toISOString() })
    let context, page
    async function resetPage() {
        if (context) await context.close()
        context = await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' })
        // Salary tables need the main document and scripts, not advertising frames or media.
        await context.route('**/*', route => {
            const request = route.request()
            if (['image', 'font', 'media'].includes(request.resourceType()) ||
                (request.isNavigationRequest() && request.frame().parentFrame())) return route.abort()
            return route.continue()
        })
        page = await context.newPage()
        page.setDefaultTimeout(30000)
        await page.addLocatorHandler(page.getByRole('button', { name: 'Reject All', exact: true }), async button => { await button.click() })
    }
    try {
        // On an empty installation every team gets a current table before any archive work.
        const jobs = [false, true].flatMap(archive => teams.map(entry => ({ entry, archive })))
        for (const { entry: [team, [slug, id]], archive } of jobs) {
            const file = path.join(ROOT, 'snapshots', `${team}.json`)
            let pages = []
            try { pages = JSON.parse(await fs.readFile(file, 'utf8')) } catch (error) {
                if (error.code !== 'ENOENT') {
                    status.failures.push({ team, error: `Cannot read saved snapshots: ${error.message}`.slice(0, 200) })
                    console.error(JSON.stringify({ team, error: 'Cannot read saved snapshots; preserving existing file' }))
                    continue
                }
            }
            try {
                await resetPage()
                await record({ team, season: currentSeason(), phase: archive ? 'archive' : 'current' })
                const response = await page.goto(`https://eu.hoopshype.com/salaries/teams/${slug}/${id}/`, { waitUntil: 'domcontentloaded', timeout: 45000 })
                if (response && !response.ok()) throw new Error(`Source HTTP ${response.status()}`)
                const rejectCookies = page.getByRole('button', { name: 'Reject All', exact: true })
                if (await rejectCookies.isVisible()) await rejectCookies.click()
                const seasonButton = page.getByRole('button', { name: /^\d{4}-\d{2} season/ })
                await seasonButton.waitFor({ state: 'visible' })
                const season = (await seasonButton.innerText()).match(/\d{4}-\d{2}/)?.[0]
                if (!season) throw new Error('Source did not identify the season')
                const html = await readTable(page, season)
                pages = pages.filter(p => p.season !== season)
                pages.push({ team, season, html, fetchedAt: new Date().toISOString() })
                await atomic(file, pages)
                if (!archive) {
                    await record({ completedCurrentTeam: team })
                    await sleep(1000)
                    continue
                }
                await seasonButton.click()
                const seasons = await page.getByRole('link', { name: /^\d{4}-\d{2} season/ }).evaluateAll(links => links.map(link => ({ label: link.textContent.match(/\d{4}-\d{2}/)?.[0], url: link.href })))
                const links = [...new Map(seasons.filter(link => link.label && new URL(link.url).hostname === 'eu.hoopshype.com').map(link => [link.label, link])).values()]
                await record({ availableSeasons: links.length })
                for (const { label, url } of links) {
                    if (pages.some(p => p.season === label)) continue
                    try {
                        await record({ team, season: label })
                        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
                        if (response && !response.ok()) throw new Error(`Source HTTP ${response.status()}`)
                        const html = await readTable(page, label)
                        pages.push({ team, season: label, html, fetchedAt: new Date().toISOString() })
                        await atomic(file, pages)
                        status.processedPages++
                        console.log(JSON.stringify({ team, season: label, pages: pages.length }))
                        await sleep(500)
                    } catch (error) {
                        status.failures.push({ team, season: label, error: error.message.slice(0, 200) })
                        // Stop on access restrictions instead of trying to bypass them.
                        if (/Access Restricted|HTTP (402|403|429|602)/i.test(error.message)) break
                    }
                }
                await record({ completedTeam: team, importedPages: pages.length })
            } catch (error) {
                status.failures.push({ team, error: error.message.slice(0, 200) })
                console.error(JSON.stringify({ team, url: page?.url(), error: error.message }))
            }
            await sleep(1000)
        }
    } finally {
        if (context) await context.close()
        await record({ running: false, nextRunAt: new Date(Date.now() + (status.failures.length ? 5 * 60_000 : INTERVAL)).toISOString() })
    }
}
async function main() {
    await fs.mkdir(path.join(ROOT, 'snapshots'), { recursive: true })
    const browser = await chromium.launch({ headless: true, chromiumSandbox: true })
    process.on('SIGTERM', () => { void browser.close().finally(() => process.exit(0)) })
    do {
        await run(browser)
        if (process.env.CONTRACT_IMPORT_ONCE === '1') break
        await sleep(status.failures.length ? 5 * 60_000 : INTERVAL)
    } while (true)
    await browser.close()
}
main().catch(error => { console.error(error); process.exitCode = 1 })
