const express = require('express')
const router = express.Router()

const { getGamesByDate } = require('../services/gamesService')

router.get('/daily-games', async (req, res) => {
    try {
        const dateStr = req.query.date
            ? String(req.query.date)
            : (() => {
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                return tomorrow.toISOString().slice(0, 10)
            })()

        const games = await getGamesByDate(dateStr)

        res.json(games)
    } catch (err) {
        console.error('Ошибка:', err)
        res.status(500).json({ error: 'Не удалось загрузить игры' })
    }
})

module.exports = router