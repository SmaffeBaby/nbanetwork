const express = require('express')
const axios = require('axios')
const fetchWithCache = require('../utils/fetchWithCache')

const router = express.Router()

const PYTHON_URL = process.env.PYTHON_API || 'http://python-backend:8000'

function readCareer(playerName) {
    return fetchWithCache({
        key: `player-career:${playerName.toLowerCase()}`,
        ttl: 86400000,
        fetcher: async () => {
            const {data} = await axios.get(`${PYTHON_URL}/player-career/${encodeURIComponent(playerName)}`,{timeout:65000})
            if (!data.player) throw new Error(data.error || 'Player career unavailable')
            return data
        }
    })
}

router.get('/player-career/:playerName', async (req,res) => {
    try {
        res.json(await readCareer(req.params.playerName))
    } catch (error) {
        console.error(error.message)
        res.status(503).json({error:'Failed to fetch player career'})
    }
})

router.get('/player-profile/:playerName/:section', async (req,res) => {
    const {playerName,section} = req.params
    const {season,id} = req.query
    if (playerName.length>100 || !['season','current','games','record','awards'].includes(section) ||
        (section==='record' && (typeof id!=='string' || !/^\d{8,10}$/.test(id))) ||
        (section==='season' && (typeof season!=='string' || !/^\d{4}-\d{2}$/.test(season)))) {
        return res.status(400).json({error:'Некорректный игрок или сезон'})
    }
    try {
        const career = await readCareer(playerName)
        if (section==='awards') {
            const playerId = career.player.PLAYER_ID
            const data = await fetchWithCache({key:`player-awards:${playerId}`,ttl:86400000,fetcher:async()=>{
                const response = await axios.get(`${PYTHON_URL}/player-awards/${playerId}`,{timeout:18000})
                return response.data
            }})
            return res.json(data)
        }
        const profile = require('../services/playerProfile')
        if (section==='season' && !career.seasons.includes(season)) return res.json({season:null,bio:null})
        if (section==='record') {
            const game = await profile.recordGame(career,id)
            return game ? res.json(game) : res.status(404).json({error:'Матч рекорда не найден'})
        }
        const data = section==='season' ? await profile.overview(career,season)
            : section==='current' ? await profile.current(career) : await profile.careerGames(career)
        res.json(data)
    } catch (error) {
        console.warn('Player profile:',error.message)
        res.status(503).json({error:'Данные игрока временно недоступны'})
    }
})

module.exports = router
