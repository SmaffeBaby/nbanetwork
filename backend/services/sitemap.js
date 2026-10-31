const TEAM_MAP = require('../constants/teamMap')
const { getAdmin } = require('../lib/supabase')
const { seasonAthletes } = require('./gamePreview')
const { seasonYear } = require('./fantasy/ratings')

// Never derive public URLs from an untrusted Host/X-Forwarded-Host header.
const configuredUrl = new URL(process.env.SITE_URL || 'https://basketsfera.ru')
if (!['http:', 'https:'].includes(configuredUrl.protocol) || configuredUrl.username || configuredUrl.password) {
    throw new Error('SITE_URL must be an HTTP(S) site origin')
}
const ORIGIN = configuredUrl.origin
const SECTIONS = ['pages', 'news', 'games', 'players']
const CHUNK_SIZE = 10000
const TTL = 10 * 60 * 1000
const STALE_TTL = 24 * 60 * 60 * 1000
const snapshots = new Map()
const pending = new Map()
const retryAfter = new Map()

function escapeXml(value) {
    return String(value).replace(/[<>&"']/g, char => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&apos;' })[char])
}
function lastmod(value) {
    const time = value ? Date.parse(value) : NaN
    return Number.isFinite(time) && time <= Date.now() ? new Date(time).toISOString() : null
}
function urlset(rows) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        rows.map(row => `  <url><loc>${escapeXml(ORIGIN + row.path)}</loc>${lastmod(row.modified) ? `<lastmod>${lastmod(row.modified)}</lastmod>` : ''}</url>`).join('\n') +
        '\n</urlset>\n'
}
function sitemapIndex(paths) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        paths.map(path => `  <sitemap><loc>${escapeXml(ORIGIN + path)}</loc></sitemap>`).join('\n') +
        '\n</sitemapindex>\n'
}
async function readRows(table, columns, visit, filter = query => query, order = 'id', pageSize = 500) {
    const db = getAdmin()
    for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await filter(db.from(table).select(columns))
            .order(order).range(offset, offset + pageSize - 1).abortSignal(AbortSignal.timeout(8000))
        if (error) throw error
        if (!Array.isArray(data)) throw new Error(`Invalid sitemap source: ${table}`)
        for (const row of data) visit(row)
        if (data.length < pageSize) break
    }
}
async function collect(section) {
    const rows = new Map()
    const add = (path, modified) => {
        if (!rows.has(path) || (lastmod(modified) || '') > (lastmod(rows.get(path).modified) || '')) rows.set(path, { path, modified })
    }
    if (section === 'pages') {
        for (const path of ['/', '/news', '/teams', '/standings', '/chart', '/playoffs', '/nba-cup', '/fantasy', '/player-stats', '/player-stats/playoffs', '/patch-note']) add(path)
        for (const team of Object.values(TEAM_MAP)) add(`/team/${team.abbr}`)
    } else if (section === 'news') {
        await readRows('news_articles', 'id,slug,updated_at,created_at', row => {
            if (row.slug) add(`/news/${encodeURIComponent(row.slug)}`, row.updated_at || row.created_at)
        }, query => query.eq('published', true))
    } else if (section === 'games') {
        // Reuse saved public schedules; crawlers must not trigger a historical API backfill.
        await readRows('nba_games_by_date_cache', 'date_key,payload', row => {
            let found = false
            for (const game of Array.isArray(row.payload) ? row.payload : []) {
                const raw = String(game.GAME_ID || '')
                if (!/^espn:\d{9}$/.test(raw)) continue
                add(`/game/${raw.slice(5)}`)
                found = true
            }
            if (found && /^\d{4}-\d{2}-\d{2}$/.test(row.date_key)) add(`/games/${row.date_key}`)
        }, undefined, 'date_key', 100)
    } else if (section === 'players') {
        const day = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Moscow', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date())
        const data = await seasonAthletes(seasonYear(day), 2)
        for (const row of data.athletes) {
            const name = row.athlete?.displayName
            if (name) add(`/player/${encodeURIComponent(name)}`)
        }
    } else throw new Error('Unknown sitemap section')
    return [...rows.values()].sort((a, b) => a.path.localeCompare(b.path))
}
async function catalog(section) {
    const saved = snapshots.get(section)
    if (saved && Date.now() - saved.at < TTL) return saved.rows
    if (Date.now() < (retryAfter.get(section) || 0)) {
        if (saved && Date.now() - saved.at < STALE_TTL) return saved.rows
        throw new Error('Sitemap source temporarily unavailable')
    }
    if (pending.has(section)) return pending.get(section)
    const task = collect(section).then(rows => {
        snapshots.set(section, {rows, at:Date.now()})
        retryAfter.delete(section)
        return rows
    }).catch(error => {
        retryAfter.set(section, Date.now() + 60000)
        if (saved && Date.now() - saved.at < STALE_TTL) return saved.rows
        throw error
    }).finally(() => pending.delete(section))
    pending.set(section, task)
    return task
}
async function index() {
    const counts = await Promise.all(SECTIONS.map(async section => [section, Math.max(1, Math.ceil((await catalog(section)).length / CHUNK_SIZE))]))
    return sitemapIndex(counts.flatMap(([section, count]) => Array.from({length:count}, (_, i) => `/sitemaps/${section}-${i + 1}.xml`)))
}
async function page(section, number) {
    if (!SECTIONS.includes(section) || !Number.isSafeInteger(number) || number < 1) return null
    const rows = await catalog(section)
    if (number > Math.max(1, Math.ceil(rows.length / CHUNK_SIZE))) return null
    return urlset(rows.slice((number - 1) * CHUNK_SIZE, number * CHUNK_SIZE))
}
const robots = `User-agent: *\nAllow: /\nDisallow: /profile\nDisallow: /reset-password\nDisallow: /internal/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`
module.exports = { index, page, robots, collect, urlset, sitemapIndex, escapeXml }
