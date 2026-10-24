const express = require('express')
const router = express.Router()

const { getGamesByDate } = require('../services/gamesService')

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