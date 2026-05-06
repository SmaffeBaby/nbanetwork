const express = require('express')
const axios = require('axios')
const router = express.Router()

const fetchWithCache = require('../utils/fetchWithCache')

router.get('/team-games/:teamId/:season', async (req, res) => {
    const { teamId, season } = req.params
    const requestedSeasonType = String(req.query.season_type || 'all')
    const seasonType = ['all', 'regular', 'playoffs'].includes(requestedSeasonType)
        ? requestedSeasonType
        : 'all'

    const key = `team-games:${teamId}:${season}:${seasonType}`
    const ttl = 1000 * 60 * 60 * 6

    try {
        const data = await fetchWithCache({
            key,
            ttl,
            fetcher: async () => {
                const response = await axios.get(
                    `http://python-backend:8000/team-games/${teamId}/${season}`,
                    {
                        params: {
                            season_type: seasonType
                        }
                    }
                )

                return response.data
            }
        })

        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

module.exports = router