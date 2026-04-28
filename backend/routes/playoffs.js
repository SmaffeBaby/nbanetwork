const express = require('express')
const axios = require('axios')
const fetchWithCache = require('../utils/fetchWithCache')

const router = express.Router()

router.get('/playoffs/:season', async (req, res) => {
    const { season } = req.params

    try {
        const data = await fetchWithCache({
            key: `playoffs-${season}`,
            ttl: 1000 * 60 * 60, // 1 час
            fetcher: async () => {
                const response = await axios.get(
                    `http://python-backend:8000/playoffs/${season}`
                )
                return response.data
            }
        })

        res.json(data)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

module.exports = router