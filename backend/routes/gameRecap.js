const express = require('express')
const router = express.Router()
const fetchWithCache = require('../utils/fetchWithCache')
const fetchGameRecap = require('../utils/fetchGameRecap')

router.get('/game-recap/:gameId', async (req, res) => {
    let { gameId } = req.params
    const { quarter, period } = req.query

    const requestedPeriod = period || quarter
    if (requestedPeriod && !/^(?:[1-9]|10|firstHalf|secondHalf|ot)$/.test(String(requestedPeriod))) {
        return res.status(400).json({ error: 'Invalid period' })
    }
    try {
        gameId = await require('../services/games/identity').resolveGameId(gameId)
        const periodFilter = parsePeriodFilter(period || quarter)

        const data = await fetchWithCache({
            key: `recap_v9_${gameId}_${periodFilter?.key || 'all'}`,
            ttl: gameId.startsWith('espn:') ? 30000 : 1000 * 60 * 30,
            fetcher: async () => {
                const data = await fetchGameRecap(gameId, periodFilter)
                if (!data) throw new Error('Game data unavailable')
                return data
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
