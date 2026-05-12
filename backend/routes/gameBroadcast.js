const axios = require('axios')
const crypto = require('crypto')
const express = require('express')
const router = express.Router()

const fetchWithCache = require('../utils/fetchWithCache')
const fetchVkBroadcast = require('../utils/fetchVkBroadcast')
const TEAM_MAP = require('../constants/teamMap')

const PYTHON_API = process.env.PYTHON_API || 'http://python-backend:8000'
const NBA_CDN_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    Referer: 'https://www.nba.com/',
    Origin: 'https://www.nba.com',
    Accept: 'application/json,text/plain,*/*'
}

router.get('/game-broadcast/:gameId', async (req, res) => {
    const { gameId } = req.params

    try {
        const tokenHash = process.env.VK_ACCESS_TOKEN
            ? crypto
                .createHash('sha1')
                .update(process.env.VK_ACCESS_TOKEN)
                .digest('hex')
                .slice(0, 8)
            : 'public'

        const data = await fetchWithCache({
            key: `game-broadcast:${gameId}:${tokenHash}`,
            ttl: 1000 * 60 * 15,
            staleWhileRevalidate: false,
            fetcher: async () => {
                const game = await fetchGameMeta(gameId)
                return fetchVkBroadcast(game)
            }
        })

        res.json(data)
    } catch (err) {
        console.error('game broadcast error:', err)
        res.status(502).json({
            status: 'error',
            error: 'Failed to load broadcast',
            message: err?.message || 'Unknown error'
        })
    }
})

async function fetchGameMeta(gameId) {
    const boxUrl = `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`
    try {
        const response = await axios.get(boxUrl, { timeout: 15000, headers: NBA_CDN_HEADERS })
        return normalizeLiveGameMeta(gameId, response.data?.game || {})
    } catch (err) {
        console.warn(`[game broadcast] Falling back to Python game detail for ${gameId}:`, err?.message || err)
        return fetchLegacyGameMeta(gameId)
    }
}

function normalizeLiveGameMeta(gameId, game) {
    const homeTeamId = game?.homeTeam?.teamId
    const awayTeamId = game?.awayTeam?.teamId
    const homeMeta = TEAM_MAP[homeTeamId] || {}
    const awayMeta = TEAM_MAP[awayTeamId] || {}

    return {
        gameId,
        dateUTC: game?.gameTimeUTC || null,
        home: {
            teamId: homeTeamId,
            abbr: game?.homeTeam?.teamTricode || homeMeta.abbr || '',
            name: homeMeta.name || game?.homeTeam?.teamName || '',
            score: game?.homeTeam?.score ?? null
        },
        away: {
            teamId: awayTeamId,
            abbr: game?.awayTeam?.teamTricode || awayMeta.abbr || '',
            name: awayMeta.name || game?.awayTeam?.teamName || '',
            score: game?.awayTeam?.score ?? null
        }
    }
}

async function fetchLegacyGameMeta(gameId) {
    const response = await axios.get(`${PYTHON_API}/game-detail/${gameId}`, { timeout: 15000 })
    const root = response.data || {}

    if (root.error) {
        throw new Error(root.error)
    }

    const summarySets = root.summary?.resultSets || []
    const gameSummary = rowsToObjects(findResultSet(summarySets, 'GameSummary'))[0] || {}
    const lineScore = rowsToObjects(findResultSet(summarySets, 'LineScore'))
    const homeTeamId = Number(gameSummary.HOME_TEAM_ID)
    const awayTeamId = Number(gameSummary.VISITOR_TEAM_ID)
    const homeLine = lineScore.find((row) => Number(row.TEAM_ID) === homeTeamId) || {}
    const awayLine = lineScore.find((row) => Number(row.TEAM_ID) === awayTeamId) || {}
    const homeMeta = TEAM_MAP[homeTeamId] || {}
    const awayMeta = TEAM_MAP[awayTeamId] || {}

    return {
        gameId,
        dateUTC: parseLegacyGameDate(gameSummary.GAME_DATE_EST),
        home: {
            teamId: homeTeamId,
            abbr: homeLine.TEAM_ABBREVIATION || homeMeta.abbr || '',
            name: homeMeta.name || homeLine.TEAM_NAME || '',
            score: toNumber(homeLine.PTS)
        },
        away: {
            teamId: awayTeamId,
            abbr: awayLine.TEAM_ABBREVIATION || awayMeta.abbr || '',
            name: awayMeta.name || awayLine.TEAM_NAME || '',
            score: toNumber(awayLine.PTS)
        }
    }
}

function findResultSet(resultSets, name) {
    return resultSets.find((set) => set.name === name)
}

function rowsToObjects(resultSet) {
    const headers = resultSet?.headers || []
    const rows = resultSet?.rowSet || []

    if (rows.length && typeof rows[0] === 'object' && !Array.isArray(rows[0])) {
        return rows
    }

    return rows.map((row) => {
        const obj = {}

        headers.forEach((header, index) => {
            obj[header] = row[index]
        })

        return obj
    })
}

function parseLegacyGameDate(value) {
    if (!value) return null

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
}

function toNumber(value) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

module.exports = router
