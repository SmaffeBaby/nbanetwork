const express = require('express')
const { canonicalTeam } = require('../services/contracts/parser')
const TEAMS = require('../services/contracts/teams')
const { getTeamContracts } = require('../services/contracts/service')
const router = express.Router()
router.get('/team-contracts/:abbr', async (req, res) => {
    const team = canonicalTeam(req.params.abbr)
    if (!TEAMS[team]) return res.status(400).json({ error: 'Unsupported team abbreviation' })
    try {
        const data = await getTeamContracts(team)
        res.set('Cache-Control', 'no-cache')
        res.json(data)
    } catch (error) {
        console.error(`Contracts ${team}:`, error.message)
        res.set('Cache-Control', 'no-store')
        res.status(503).json({ error: 'Contracts unavailable', message: 'Сохранённые контракты пока недоступны. Импорт данных выполняется автоматически; попробуйте ещё раз чуть позже.' })
    }
})
module.exports = router
