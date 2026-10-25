const router = require('express').Router()
const { resolveGameId } = require('../services/games/identity')
router.get('/game-identity/:gameId', async (req,res) => {
    try {
        const gameId = await resolveGameId(req.params.gameId, { date:req.query.date, homeAbbr:req.query.home, awayAbbr:req.query.away, nbaDate:req.query.nbaDate === '1' })
        res.json({ gameId, source:'espn', publicId:gameId.slice(5) })
    } catch(error) { res.status(422).json({ error:error.message || 'Матч не найден в ESPN' }) }
})
module.exports = router
