const express = require('express')
const router = express.Router()

const fetchWithCache = require('../utils/fetchWithCache')
const PYTHON_URL = process.env.PYTHON_API || 'http://python-backend:8000'

router.get('/current-season', async (req, res) => {
    try {
        const data = await fetchWithCache({
            key: 'current-season',
            ttl: 1000 * 60 * 60 * 24,
            fetcher: async () => {
                const response = await fetch(`${PYTHON_URL}/current-season`)

                if (!response.ok) {
                    throw new Error(`Python current-season failed: ${response.status}`)
                }

                return response.json()
            }
        })

        res.json(data)
    } catch (err) {
        console.error('current-season error:', err)
        res.status(500).json({ error: 'Failed to get current season' })
    }
})

module.exports = router
