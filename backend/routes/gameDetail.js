const express = require('express')
const router = express.Router()

const fetchWithCache = require('../utils/fetchWithCache')
const TEAM_MAP = require('../constants/teamMap')

const PYTHON_API = process.env.PYTHON_API || 'http://python-backend:8000'

function normalizeGame(data) {
    const summary = data?.summary

    const gameSummary = summary?.resultSets?.find(
        (r) => r.name === 'GameSummary'
    )

    const lineScore = summary?.resultSets?.find(
        (r) => r.name === 'LineScore'
    )

    const gameRow = gameSummary?.rowSet?.[0]

    if (!gameRow) {
        throw new Error('Invalid game summary data')
    }

    const homeTeamId = gameRow[6]
    const awayTeamId = gameRow[7]

    const rows = lineScore?.rowSet || []

    const homeRow = rows.find((r) => r[3] === homeTeamId)
    const awayRow = rows.find((r) => r[3] === awayTeamId)

    const homeMeta = TEAM_MAP[homeTeamId] || {}
    const awayMeta = TEAM_MAP[awayTeamId] || {}

    return {
        gameId: gameRow[2],
        status: gameRow[4] || 'Game',

        home: {
            teamId: homeTeamId,
            abbr: homeMeta.abbr || '',
            name: homeMeta.name || '',
            score: homeRow?.[22] ?? 0
        },

        away: {
            teamId: awayTeamId,
            abbr: awayMeta.abbr || '',
            name: awayMeta.name || '',
            score: awayRow?.[22] ?? 0
        }
    }
}

router.get('/game-detail/:gameId', async (req, res) => {
    const { gameId } = req.params

    const key = `game-detail:${gameId}`

    try {
        const raw = await fetchWithCache({
            key,
            ttl: 1000 * 60 * 10,
            fetcher: async () => {
                const response = await fetch(
                    `${PYTHON_API}/game-detail/${gameId}`
                )

                if (!response.ok) {
                    throw new Error(
                        `Python API error: ${response.status}`
                    )
                }

                return await response.json()
            }
        })

        const game = normalizeGame(raw)

        return res.json(game)

    } catch (err) {
        console.error('[game-detail error]', err)

        return res.status(500).json({
            error: 'Failed to fetch game detail',
            message: err.message
        })
    }
})

module.exports = router