const express = require('express')
const router = express.Router()
const fetchWithCache = require('../utils/fetchWithCache')

const PYTHON_API = process.env.PYTHON_API || 'http://python-backend:8000'

router.get('/game-detail/:gameId', async (req, res) => {
    const { gameId } = req.params

    const key = `game-detail:${gameId}`

    try {
        const data = await fetchWithCache({
            key,
            ttl: 1000 * 60 * 10,
            fetcher: async () => {
                const response = await fetch(`${PYTHON_API}/game-detail/${gameId}`)

                if (!response.ok) {
                    throw new Error(`Python API error: ${response.status}`)
                }

                return await response.json()
            }
        })

        res.json(data)

    } catch (err) {
        console.error(err)
        res.status(500).json({
            error: 'Failed to fetch game detail',
            message: err.message
        })
    }
})

module.exports = router