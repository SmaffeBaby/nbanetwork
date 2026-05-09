const express = require('express')
const router = express.Router()
const axios = require('axios')

const fetchWithCache = require('../utils/fetchWithCache')
const {
    readGamesByDateCache,
    writeGamesByDateCache
} = require('../services/gamesByDateCache')

const MEMORY_CACHE_TTL = 30 * 1000
const pendingDateRequests = new Map()

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

router.get('/games/by-date/:date', async (req, res) => {
    const { date } = req.params

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json([])
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
