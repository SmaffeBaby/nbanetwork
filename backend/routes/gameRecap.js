const express = require('express')
const router = express.Router()
const fetchWithCache = require('../utils/fetchWithCache')
const fetchGameRecap = require('../utils/fetchGameRecap')

router.get('/game-recap/:gameId', async (req, res) => {
    const { gameId } = req.params
    const { quarter, period } = req.query

    try {
        const periodFilter = parsePeriodFilter(period || quarter)

        const data = await fetchWithCache({
            key: `recap_v7_${gameId}_${periodFilter?.key || 'all'}`,
            ttl: 1000 * 60 * 30,
            fetcher: async () => {
                return await fetchGameRecap(gameId, periodFilter)
            }
        })

        res.json(data)
    } catch (e) {
        console.error('GAME RECAP ROUTE ERROR:', e)
        res.status(500).json({ error: 'Failed to load recap' })
    }
})

function parsePeriodFilter(value) {
    if (!value) return null

    const normalized = String(value)

    if (!isNaN(Number(normalized))) {
        const quarter = Number(normalized)

        return {
            key: `q${quarter}`,
            startPeriod: quarter,
            endPeriod: quarter
        }
    }

    if (normalized === 'firstHalf') {
        return {
            key: 'firstHalf',
            startPeriod: 1,
            endPeriod: 2
        }
    }

    if (normalized === 'secondHalf') {
        return {
            key: 'secondHalf',
            startPeriod: 3,
            endPeriod: 4
        }
    }

    if (normalized === 'ot') {
        return {
            key: 'ot',
            startPeriod: 5,
            endPeriod: 10
        }
    }

    return null
}

module.exports = router
