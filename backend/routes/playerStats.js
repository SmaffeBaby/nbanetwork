const express = require('express')
const axios = require('axios')
const fetchWithCache = require('../utils/fetchWithCache')

const router = express.Router()

router.get('/player-stats/:season', async (req, res) => {
    try {
        const { season } = req.params
        const cacheKey = `player-stats:${season}`
        const ttl = 1000 * 60 * 10

        const data = await fetchWithCache({
            key: cacheKey,
            ttl,
            fetcher: async () => {
                const response = await axios.get(
                    `http://python-backend:8000/player-stats/${season}`
                )
                return response.data
            }
        })

        res.json(data)
    } catch (error) {
        console.error(error.message)
        res.status(500).json({ error: 'Failed to fetch player stats' })
    }
})

module.exports = router