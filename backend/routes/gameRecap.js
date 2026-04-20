const express = require('express')
const router = express.Router()
const fetchWithCache = require('../utils/fetchWithCache')
const fetchGameRecap = require('../utils/fetchGameRecap')

router.get('/game-recap/:gameId', async (req, res) => {
    const { gameId } = req.params
    const { quarter } = req.query

    try {
        const parsedQuarter =
            quarter && !isNaN(Number(quarter))
                ? Number(quarter)
                : null

        const data = await fetchWithCache({
            key: `recap_${gameId}_q${parsedQuarter || 'all'}`,
            ttl: 1000 * 60 * 30,
            fetcher: async () => {
                return await fetchGameRecap(gameId, parsedQuarter)
            }
        })

        res.json(data)
    } catch (e) {
        console.error('GAME RECAP ROUTE ERROR:', e)
        res.status(500).json({ error: 'Failed to load recap' })
    }
})

module.exports = router