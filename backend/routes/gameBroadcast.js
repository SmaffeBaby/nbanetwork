const axios = require('axios')
const crypto = require('crypto')
const express = require('express')
const router = express.Router()

const fetchWithCache = require('../utils/fetchWithCache')
const fetchVkBroadcast = require('../utils/fetchVkBroadcast')
const TEAM_MAP = require('../constants/teamMap')

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
    const response = await axios.get(boxUrl, { timeout: 15000 })
    const game = response.data?.game || {}
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

module.exports = router
