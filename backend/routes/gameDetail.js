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

function rowsToObjects(resultSet) {
    const headers = resultSet?.headers || []
    const rows = resultSet?.rowSet || []

    return rows.map((row) => {
        const obj = {}

        headers.forEach((header, index) => {
            obj[header] = row[index]
        })

        return obj
    })
}

function toNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null

    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

function getTeamId(...values) {
    for (const value of values) {
        const teamId = toNumberOrNull(value)

        if (teamId && TEAM_MAP[teamId]) {
            return teamId
        }
    }

    return toNumberOrNull(values.find((value) => value !== null && value !== undefined))
}

function normalizeGame(data) {
    const summary = data?.summary
    const boxscore = data?.boxscore
    const metadata = data?.metadata

    const gameSummary = summary?.resultSets?.find(
        (r) => r.name === 'GameSummary'
    )

    const lineScore = summary?.resultSets?.find(
        (r) => r.name === 'LineScore'
    )
    const teamStats = boxscore?.resultSets?.find(
        (r) => r.name === 'TeamStats'
    )

    const gameRow = rowsToObjects(gameSummary)[0]
    const teamStatsRows = rowsToObjects(teamStats)
    const homeStatsRow = teamStatsRows[0] || {}
    const awayStatsRow = teamStatsRows[1] || {}

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

    const homeTeamId = getTeamId(gameRow.HOME_TEAM_ID, metadata?.HOME_TEAM_ID, homeStatsRow.TEAM_ID)
    const awayTeamId = getTeamId(gameRow.VISITOR_TEAM_ID, metadata?.VISITOR_TEAM_ID, awayStatsRow.TEAM_ID)

    const rows = rowsToObjects(lineScore)

    const homeRow = rows.find((r) => Number(r.TEAM_ID) === Number(homeTeamId)) || homeStatsRow
    const awayRow = rows.find((r) => Number(r.TEAM_ID) === Number(awayTeamId)) || awayStatsRow

    const homeMeta = TEAM_MAP[homeTeamId] || {}
    const awayMeta = TEAM_MAP[awayTeamId] || {}

    const gameDateUTC = !isPlaceholderDate(metadata?.GAME_TIME_UTC) && hasExplicitTime(metadata.GAME_TIME_UTC)
        ? metadata.GAME_TIME_UTC
        : (!isPlaceholderDate(gameRow.GAME_DATE_EST) && hasExplicitTime(gameRow.GAME_DATE_EST) ? gameRow.GAME_DATE_EST : null)
    const gameDateMSK = formatMSKDateTime(gameDateUTC, metadata?.GAME_DATE_MSK || '')

    return {
        gameId: gameRow.GAME_ID || metadata?.GAME_ID,
        status: gameRow.GAME_STATUS_TEXT || metadata?.GAME_STATUS || 'Game',

        dateUTC: gameDateUTC,
        dateMSK: gameDateMSK,

        home: {
            teamId: homeTeamId,
            abbr: homeRow?.TEAM_ABBREVIATION || metadata?.HOME_TEAM_ABBREVIATION || homeMeta.abbr || '',
            name: homeMeta.name || homeRow?.TEAM_NAME || metadata?.HOME_TEAM_ABBREVIATION || '',
            score: toNumberOrNull(homeRow?.PTS) ?? toNumberOrNull(metadata?.HOME_TEAM_SCORE)
        },

        away: {
            teamId: awayTeamId,
            abbr: awayRow?.TEAM_ABBREVIATION || metadata?.VISITOR_TEAM_ABBREVIATION || awayMeta.abbr || '',
            name: awayMeta.name || awayRow?.TEAM_NAME || metadata?.VISITOR_TEAM_ABBREVIATION || '',
            score: toNumberOrNull(awayRow?.PTS) ?? toNumberOrNull(metadata?.VISITOR_TEAM_SCORE)
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
