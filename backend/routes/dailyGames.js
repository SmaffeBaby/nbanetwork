const express = require('express')
const router = express.Router()
const axios = require('axios')

const fetchWithCache = require('../utils/fetchWithCache')

const ONE_HOUR = 1000 * 60 * 60

router.get('/games/by-date/:date', async (req, res) => {
    const { date } = req.params

    try {
        const games = await fetchWithCache({
            key: `games-by-date:${date}`,
            ttl: ONE_HOUR,
            fetcher: async () => {
                const response = await axios.get(
                    `http://python-backend:8000/games/by-date/${date}`
                )

                return response.data
            }
        })

        res.json(games)
    } catch (e) {
        console.error(e)
        res.status(500).json([])
    }
})

module.exports = router