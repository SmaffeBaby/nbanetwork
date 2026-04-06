const express = require('express')
const fetchWithCache = require('../utils/fetchWithCache')

const router = express.Router()

router.get('/standings/:season', async (req, res) => {
    const { season } = req.params

    try {
        const data = await fetchWithCache({
            key: `standings_${season}`,
            ttl: 1000 * 60 * 30,
            fetcher: async () => {
                const response = await fetch(
                    `http://python-backend:8000/standings/${season}`
                )
                return response.json()
            }
        })

        res.json(data)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Failed to fetch standings' })
    }
})

module.exports = router