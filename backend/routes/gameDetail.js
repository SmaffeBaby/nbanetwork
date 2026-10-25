const router = require('express').Router()
const { resolveGameId } = require('../services/games/identity')
const { getEspnGame } = require('../services/espnGameService')
router.get('/game-detail/:gameId', async (req,res) => {
    try {
        const gameId = await resolveGameId(req.params.gameId)
        const recap = await getEspnGame(gameId)
        const m = recap.meta
        res.json({ gameId, source:'espn', status:m.status, dateUTC:recap.dateUTC, dateMSK:recap.dateMSK,
            home:{teamId:m.homeTeamId,abbr:m.homeAbbr,name:m.homeTeam,score:m.homeScore},
            away:{teamId:m.awayTeamId,abbr:m.awayAbbr,name:m.awayTeam,score:m.awayScore} })
    } catch(error) { res.status(503).json({error:'Не удалось загрузить матч ESPN',message:error.message}) }
})
module.exports = router
