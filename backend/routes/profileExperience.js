const router = require('express').Router()
const { requireUser } = require('../middleware/auth')
const { getAdmin } = require('../lib/supabase')
router.get('/profiles/:id/experience', requireUser, async (req, res) => {
    if (!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(req.params.id)) return res.status(400).json({ error: 'Некорректный профиль' })
    const kind = req.query.kind || null
    const offset = Number(req.query.offset || 0)
    if ((kind !== null && !['watched', 'prediction', 'fantasy'].includes(kind)) || !Number.isSafeInteger(offset) || offset < 0 || offset > 1000000) return res.status(400).json({ error: 'Некорректный фильтр истории' })
    try {
        const db = getAdmin()
        const { data: profile, error: profileError } = await db.from('profiles').select('id').eq('id', req.params.id).maybeSingle().abortSignal(AbortSignal.timeout(5000))
        if (profileError) throw profileError
        if (!profile) return res.status(404).json({ error: 'Профиль не найден' })
        const { data, error } = await db.rpc('read_profile_experience', { p_user_id: req.params.id, p_kind: kind, p_offset: offset }).abortSignal(AbortSignal.timeout(5000))
        if (error) throw error
        res.set('Cache-Control', 'private, no-store').json(data)
    } catch { res.status(503).json({ error: 'Не удалось загрузить прогресс' }) }
})
module.exports = router
