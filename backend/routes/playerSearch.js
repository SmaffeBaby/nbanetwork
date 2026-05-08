const express = require('express')
const axios = require('axios')
const fetchWithCache = require('../utils/fetchWithCache')

const router = express.Router()
const PYTHON_URL = 'http://python-backend:8000'

router.get('/players/search', async (req, res) => {
    try {
        const query = String(req.query.q || '').trim()

        if (query.length < 2) {
            return res.json({ data: [] })
        }

        const cacheKey = `players-search:${query.toLowerCase()}`

        const data = await fetchWithCache({
            key: cacheKey,
            ttl: 1000 * 60 * 60 * 24,
            fetcher: async () => {
                const response = await axios.get(`${PYTHON_URL}/players/search`, {
                    params: { q: query }
                })

                return response.data
            }
        })

        res.json(data)
    } catch (error) {
        console.error(error.message)
        res.status(500).json({ error: 'Failed to search players' })
    }
})

module.exports = router
