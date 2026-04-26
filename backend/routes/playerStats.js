const express = require('express')
const axios = require('axios')
const fetchWithCache = require('../utils/fetchWithCache')

const router = express.Router()

const PYTHON_URL = 'http://python-backend:8000'

router.get('/player-stats/:season', async (req, res) => {
    try {
        const { season } = req.params

        const cacheKey = `player-stats:regular:${season}`

        const data = await fetchWithCache({
            key: cacheKey,
            ttl: 1000 * 60 * 10,
            fetcher: async () => {
                const response = await axios.get(
                    `${PYTHON_URL}/player-stats/${season}`
                )
                return response.data
            }
        })

        res.json(data)

    } catch (error) {
        console.error(error.message)
        res.status(500).json({ error: 'Failed to fetch regular stats' })
    }
})

router.get('/player-stats/playoffs/:season', async (req, res) => {
    try {
        const { season } = req.params

        const cacheKey = `player-stats:playoffs:${season}`

        const data = await fetchWithCache({
            key: cacheKey,
            ttl: 1000 * 60 * 10,
            fetcher: async () => {
                const response = await axios.get(
                    `${PYTHON_URL}/player-stats/playoffs/${season}`
                )
                return response.data
            }
        })

        res.json(data)

    } catch (error) {
        console.error(error.message)
        res.status(500).json({ error: 'Failed to fetch playoffs stats' })
    }
})

router.get('/player-stats/all/:season', async (req, res) => {
    try {
        const { season } = req.params

        const cacheKey = `player-stats:all:${season}`

        const data = await fetchWithCache({
            key: cacheKey,
            ttl: 1000 * 60 * 10,
            fetcher: async () => {
                const response = await axios.get(
                    `${PYTHON_URL}/player-stats/all/${season}`
                )
                return response.data
            }
        })

        res.json(data)

    } catch (error) {
        console.error(error.message)
        res.status(500).json({ error: 'Failed to fetch all stats' })
    }
})

module.exports = router