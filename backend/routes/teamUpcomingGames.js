const express = require('express')
const axios = require('axios')
const fetchWithCache = require('../utils/fetchWithCache')

const router = express.Router()

const TTL = 1000 * 60 * 5

router.get('/team-upcoming-games/:teamId', async (req, res) => {
    const { teamId } = req.params

    try {
        const data = await fetchWithCache({
            key: `team-upcoming-v2-${teamId}`,
            ttl: TTL,
            fetcher: async () => {
                console.log('🌐 fetching upcoming games from FastAPI')

                const response = await axios.get(
                    `http://python-backend:8000/team-upcoming-games/${teamId}`
                )

                return response.data
            }
        })

        res.json(data)

    } catch (e) {
        console.error('❌ upcoming games error:', e.message)
        res.status(500).json({ error: 'Failed to fetch upcoming games' })
    }
})

module.exports = router