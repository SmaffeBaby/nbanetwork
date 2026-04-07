const express = require('express')
const axios = require('axios')
const fetchWithCache = require('../utils/fetchWithCache')

const router = express.Router()

router.get('/player-gamelog/:playerId/:season', async (req, res) => {
    try {
        const { playerId, season } = req.params
        const cacheKey = `player-gamelog:${playerId}:${season}`
        const ttl = 1000 * 60 * 5 // 5 минут

        const data = await fetchWithCache({
            key: cacheKey,
            ttl,
            fetcher: async () => {
                const response = await axios.get(
                    `http://python-backend:8000/player-gamelog/${playerId}/${season}`
                )
                return response.data
            }
        })

        res.json(data)
    } catch (error) {
        console.error(error.message)
        res.status(500).json({ error: 'Failed to fetch player game log' })
    }
})

module.exports = router