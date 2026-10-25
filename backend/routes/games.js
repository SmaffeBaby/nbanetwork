const express = require('express')
const router = express.Router()

const axios = require('axios')
const fetchWithCache = require('../utils/fetchWithCache')
const { getGamesByDate, normalizeGames } = require('../services/gamesService')

router.get('/upcoming-games', async (_req, res) => {
    try {
        const games = await fetchWithCache({
            key: 'upcoming-games-v1',
            ttl: 15000,
            fetcher: async () => {
                const response = await axios.get('http://python-backend:8000/games/upcoming', { timeout: 25000 })
                if (!Array.isArray(response.data)) throw new Error('Invalid upcoming games response')
                return normalizeGames(response.data)
            }
        })
        res.set('Cache-Control', 'no-cache')
        res.json(games)
    } catch (error) {
        console.error('Upcoming games error:', error.message)
        res.set('Cache-Control', 'no-store')
        res.status(503).json({ error: 'Не удалось загрузить ближайшие игры' })
    }
})

router.get('/daily-games', async (req, res) => {
    try {
        const dateStr = req.query.date
            ? String(req.query.date)
            : (() => {
                return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date())
            })()

        const { isAllowedDate } = require('./dailyGames')
        if (!isAllowedDate(dateStr)) return res.status(400).json({ error: 'Invalid date' })
        const games = await getGamesByDate(dateStr)

        res.set('Cache-Control', 'public, max-age=30')
        res.json(games)
    } catch (err) {
        console.error('Ошибка:', err)
        res.set('Cache-Control', 'no-store')
        res.status(503).json({ error: 'Не удалось загрузить игры' })
    }
})

module.exports = router