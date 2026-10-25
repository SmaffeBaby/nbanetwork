const router = require('express').Router()
const { requireUser } = require('../middleware/auth')
const { getAdmin } = require('../lib/supabase')
const { resolveGameId, sameGame, snapshotFromRecap } = require('../services/games/identity')
const { getEspnGame } = require('../services/espnGameService')
router.put('/profile-games/:kind', requireUser, async(req,res) => {
    if (!['favorite','watched'].includes(req.params.kind) || typeof req.body?.active !== 'boolean') return res.status(400).json({ error:'Некорректная отметка матча' })
    try {
        const input = req.body.game || {}
        const id = await resolveGameId(input.id, input)
        const {data:profile,error:readError} = await getAdmin().from('profiles').select('favorites_games,watched_games').eq('id',req.user.id).single().abortSignal(AbortSignal.timeout(5000))
        if (readError) throw readError
        const saved = [...(profile.favorites_games || []), ...(profile.watched_games || [])]
        // Removing a saved mark must not depend on the publisher being available.
        const previous = saved.find(item => sameGame(item, { ...input, id }))
        const game = req.body.active
            ? snapshotFromRecap(await getEspnGame(id))
            : { ...(previous || { date:null,homeName:'',awayName:'',homeAbbr:'',awayAbbr:'',homeScore:null,awayScore:null }), id,source:'espn' }
        const aliases = [...new Set([input.id, id, id.slice(5), ...saved.filter(item=>sameGame(item,game)).map(item=>String(item.id))])]
        const {data,error} = await getAdmin().rpc('set_profile_game', { p_user_id:req.user.id, p_kind:req.params.kind, p_game:game, p_active:req.body.active, p_aliases:aliases }).abortSignal(AbortSignal.timeout(5000))
        if (error) throw error
        res.json(data)
    } catch(error) { res.status(503).json({error:error.message || 'Не удалось сохранить отметку матча'}) }
})
module.exports = router
