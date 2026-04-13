const express = require('express')
const router = express.Router()
const fetchWithCache = require('../utils/fetchWithCache')
const fetchGameRecap = require('../utils/fetchGameRecap')

router.get('/game-recap/:gameId', async (req, res) => {
    const { gameId } = req.params

    try {
        const data = await fetchWithCache({
            key: `recap_${gameId}`,
            ttl: 1000 * 60 * 30,
            fetcher: async () => {
                return await fetchGameRecap(gameId)
            }
        })

        res.json(data)
    } catch (e) {
        res.status(500).json({ error: 'Failed to load recap' })
    }
})

module.exports = router