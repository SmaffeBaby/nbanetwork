const express = require('express')
const router = express.Router()
const axios = require('axios')

const fetchWithCache = require('../utils/fetchWithCache')
const {
    readGamesByDateCache,
    writeGamesByDateCache
} = require('../services/gamesByDateCache')

const MEMORY_CACHE_TTL = 30 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const MIN_DATE_KEY = '2000-01-01'
const MAX_FUTURE_DAYS = 370
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 60
const pendingDateRequests = new Map()
const requestBuckets = new Map()

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

function parseDateKey(dateKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null

    const date = new Date(`${dateKey}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime())) return null
    if (date.toISOString().slice(0, 10) !== dateKey) return null

    return date
}

function isAllowedDate(dateKey) {
    const date = parseDateKey(dateKey)
    if (!date) return false

    const today = parseDateKey(getMskDateKey())
    const maxDate = new Date(today.getTime() + MAX_FUTURE_DAYS * DAY_MS)

    return dateKey >= MIN_DATE_KEY && date <= maxDate
}

function rateLimitGamesByDate(req, res, next) {
    const now = Date.now()
    const forwardedFor = String(req.headers['x-forwarded-for'] || '')
        .split(',')[0]
        .trim()
    const key = forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown'
    const bucket = requestBuckets.get(key)

    if (!bucket || now >= bucket.resetAt) {
        requestBuckets.set(key, {
            count: 1,
            resetAt: now + RATE_LIMIT_WINDOW_MS
        })
        return next()
    }

    bucket.count += 1

    if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
        const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
        res.set('Retry-After', String(retryAfter))
        return res.status(429).json({ error: 'Too many requests' })
    }

    return next()
}

setInterval(() => {
    const now = Date.now()

    for (const [key, bucket] of requestBuckets.entries()) {
        if (now >= bucket.resetAt) {
            requestBuckets.delete(key)
        }
    }
}, RATE_LIMIT_WINDOW_MS).unref()

async function fetchAndCacheGames(date) {
    const pending = pendingDateRequests.get(date)
    if (pending) return pending

    const request = axios.get(
        `http://python-backend:8000/games/by-date/${date}`
    )
        .then(async (response) => {
            const games = Array.isArray(response.data) ? response.data : []

            try {
                await writeGamesByDateCache(date, games)
            } catch (cacheError) {
                console.error('Failed to write games cache:', cacheError)
            }

            return games
        })
        .finally(() => pendingDateRequests.delete(date))

    pendingDateRequests.set(date, request)

    return request
}

async function resolveGamesByDate(date) {
    try {
        const cachedGames = await readGamesByDateCache(date)
        if (cachedGames) {
            return cachedGames
        }
    } catch (cacheError) {
        console.error('Failed to read games cache:', cacheError)
    }

    return fetchAndCacheGames(date)
}

router.get('/games/by-date/:date', rateLimitGamesByDate, async (req, res) => {
    const { date } = req.params

    if (!isAllowedDate(date)) {
        return res.status(400).json({ error: 'Invalid date' })
    }

    try {
        const games = await fetchWithCache({
            key: `games-by-date-memory:${date}`,
            ttl: MEMORY_CACHE_TTL,
            staleWhileRevalidate: false,
            fetcher: () => resolveGamesByDate(date)
        })

        res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
        res.json(games)
    } catch (e) {
        console.error(e)
        res.status(500).json([])
    }
})

module.exports = router
