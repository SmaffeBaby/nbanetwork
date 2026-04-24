const express = require('express')
const router = express.Router()

const fetchWithCache = require('../utils/fetchWithCache')

function getCurrentNbaSeason() {
    const now = new Date()
    const year = now.getFullYear()

    if (now.getMonth() >= 9) {
        return `${year}-${String(year + 1).slice(-2)}`
    } else {
        return `${year - 1}-${String(year).slice(-2)}`
    }
}

router.get('/current-season', async (req, res) => {
    try {
        const data = await fetchWithCache({
            key: 'current-season',
            ttl: 1000 * 60 * 60 * 24,
            fetcher: async () => {
                return {
                    season: getCurrentNbaSeason()
                }
            }
        })

        res.json(data)
    } catch (err) {
        console.error('current-season error:', err)
        res.status(500).json({ error: 'Failed to get current season' })
    }
})

module.exports = router