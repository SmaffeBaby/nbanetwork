const express = require('express')
const axios = require('axios')
const fetchWithCache = require('../utils/fetchWithCache')

const router = express.Router()

const TTL = 1000 * 60 * 5

router.get('/team-upcoming-games/:teamId', async (req, res) => {
    const { teamId } = req.params

    if (!/^\d{10}$/.test(teamId)) return res.status(400).json({ error: 'Invalid team' })

    try {
        const data = await fetchWithCache({
            key: `team-upcoming-v2-${teamId}`,
            ttl: TTL,
            fetcher: async () => {
                console.log('🌐 fetching upcoming games from FastAPI')

                const response = await axios.get(
                    `http://python-backend:8000/team-upcoming-games/${teamId}`,
                    { timeout: 25000 }
                )

                if (!Array.isArray(response.data?.resultSets?.[0]?.rowSet)) throw new Error('Invalid schedule response')
                return response.data
            }
        })

        res.set('Cache-Control', 'public, max-age=60')
        res.json(data)

    } catch (e) {
        console.error('❌ upcoming games error:', e.message)
        res.set('Cache-Control', 'no-store')
        res.status(503).json({ error: 'Failed to fetch upcoming games' })
    }
})

module.exports = router