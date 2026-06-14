const express = require('express')
const router = express.Router()

const fetchWithCache = require('../utils/fetchWithCache')
const TEAM_MAP = require('../constants/teamMap')

const PYTHON_API = process.env.PYTHON_API || 'http://python-backend:8000'

function isPlaceholderDate(value) {
    return !value || String(value).trim().startsWith('1900-01-01')
}

function hasExplicitTime(value) {
    return /T\d{2}:\d{2}/.test(String(value || ''))
}

function formatMSKDateTime(value, fallback = '') {
    if (isPlaceholderDate(value) || !hasExplicitTime(value)) return fallback

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return fallback

    return date.toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

function normalizeGame(data) {
    const summary = data?.summary
    const metadata = data?.metadata

    const gameSummary = summary?.resultSets?.find(
        (r) => r.name === 'GameSummary'
    )

    const lineScore = summary?.resultSets?.find(
        (r) => r.name === 'LineScore'
    )

    const gameRow = gameSummary?.rowSet?.[0]

    if (!gameRow) {
        if (!metadata?.GAME_ID) {
            throw new Error('Invalid game summary data')
        }

        const homeMeta = TEAM_MAP[metadata.HOME_TEAM_ID] || {}
        const awayMeta = TEAM_MAP[metadata.VISITOR_TEAM_ID] || {}
        const gameDateUTC = !isPlaceholderDate(metadata.GAME_TIME_UTC) && hasExplicitTime(metadata.GAME_TIME_UTC)
            ? metadata.GAME_TIME_UTC
            : null
        const gameDateMSK = formatMSKDateTime(gameDateUTC, metadata.GAME_DATE_MSK || '')

        return {
            gameId: metadata.GAME_ID,
            status: metadata.GAME_STATUS || 'TBD',

            dateUTC: gameDateUTC,
            dateMSK: gameDateMSK,

            home: {
                teamId: metadata.HOME_TEAM_ID,
                abbr: metadata.HOME_TEAM_ABBREVIATION || homeMeta.abbr || '',
                name: homeMeta.name || metadata.HOME_TEAM_ABBREVIATION || '',
                score: metadata.HOME_TEAM_SCORE ?? null
            },

            away: {
                teamId: metadata.VISITOR_TEAM_ID,
                abbr: metadata.VISITOR_TEAM_ABBREVIATION || awayMeta.abbr || '',
                name: awayMeta.name || metadata.VISITOR_TEAM_ABBREVIATION || '',
                score: metadata.VISITOR_TEAM_SCORE ?? null
            }
        }
    }

    const homeTeamId = gameRow[6]
    const awayTeamId = gameRow[7]

    const rows = lineScore?.rowSet || []

    const homeRow = rows.find((r) => r[3] === homeTeamId)
    const awayRow = rows.find((r) => r[3] === awayTeamId)

    const homeMeta = TEAM_MAP[homeTeamId] || {}
    const awayMeta = TEAM_MAP[awayTeamId] || {}

    const gameDateUTC = !isPlaceholderDate(metadata?.GAME_TIME_UTC) && hasExplicitTime(metadata.GAME_TIME_UTC)
        ? metadata.GAME_TIME_UTC
        : (!isPlaceholderDate(gameRow[0]) && hasExplicitTime(gameRow[0]) ? gameRow[0] : null)
    const gameDateMSK = formatMSKDateTime(gameDateUTC, metadata?.GAME_DATE_MSK || '')

    return {
        gameId: gameRow[2],
        status: gameRow[4] || 'Game',

        dateUTC: gameDateUTC,
        dateMSK: gameDateMSK,

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

    const key = `game-detail:v2:${gameId}`

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