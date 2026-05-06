const express = require('express')
const axios = require('axios')
const fetchWithCache = require('../utils/fetchWithCache')

const router = express.Router()

const PYTHON_URL = process.env.PYTHON_API || 'http://python-backend:8000'

router.get('/player-career/:playerName', async (req, res) => {
    try {
        const { playerName } = req.params
        const cacheKey = `player-career:${playerName.toLowerCase()}`

        const data = await fetchWithCache({
            key: cacheKey,
            ttl: 1000 * 60 * 60 * 24,
            fetcher: async () => {
                const response = await axios.get(
                    `${PYTHON_URL}/player-career/${encodeURIComponent(playerName)}`
                )
                return response.data
            }
        })

        res.json(data)
    } catch (error) {
        console.error(error.message)
        res.status(500).json({ error: 'Failed to fetch player career' })
    }
})

module.exports = router
