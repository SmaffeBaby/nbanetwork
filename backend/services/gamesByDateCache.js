const { getAdmin } = require('../lib/supabase')

const TABLE = 'nba_games_by_date_cache'
const SOURCE = 'espn-calendar-v3'
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function parseDateKey(dateKey) {
    const date = new Date(`${dateKey}T00:00:00.000Z`)
    return Number.isNaN(date.getTime()) ? null : date
}

function getMskDateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date)

    const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
    return `${values.year}-${values.month}-${values.day}`
}

function diffInDays(dateKey, baseDateKey = getMskDateKey()) {
    const date = parseDateKey(dateKey)
    const base = parseDateKey(baseDateKey)

    if (!date || !base) return 0

    return Math.round((date.getTime() - base.getTime()) / DAY)
}

function isFinalGame(game) {
    const status = String(game?.GAME_STATUS || '').toLowerCase()
    return status.includes('final')
}

function getTtlMs(dateKey, payload) {
    const dayDiff = diffInDays(dateKey)
    const games = Array.isArray(payload) ? payload : []

    if (games.length === 0) return MINUTE
    if (dayDiff >= 1) return 6 * HOUR
    if (dayDiff >= -1) return 30 * 1000

    if (games.length === 0 || games.every(isFinalGame)) return 30 * DAY

    return 5 * MINUTE
}

function isFresh(row) {
    if (!row?.fetched_at) return false

    const fetchedAt = new Date(row.fetched_at).getTime()
    if (Number.isNaN(fetchedAt)) return false

    return Date.now() - fetchedAt < getTtlMs(row.date_key, row.payload)
}

async function readGamesByDateCache(dateKey) {
    const supabase = getAdmin()
    const { data, error } = await supabase
        .from(TABLE)
        .select('date_key,payload,fetched_at,game_count,source')
        .eq('date_key', dateKey)
        .maybeSingle()
        .abortSignal(AbortSignal.timeout(1500))

    if (error) throw error
    if (!data || data.source !== SOURCE || !isFresh(data)) return null

    return Array.isArray(data.payload) ? data.payload : []
}

async function writeGamesByDateCache(dateKey, games) {
    const supabase = getAdmin()
    const payload = Array.isArray(games) ? games : []
    const { error } = await supabase
        .from(TABLE)
        .upsert({
            date_key: dateKey,
            payload,
            game_count: payload.length,
            fetched_at: new Date().toISOString(),
            source: SOURCE
        }, { onConflict: 'date_key' })
        .abortSignal(AbortSignal.timeout(1500))

    if (error) throw error

    return payload
}

module.exports = {
    getTtlMs,
    readGamesByDateCache,
    writeGamesByDateCache
}
