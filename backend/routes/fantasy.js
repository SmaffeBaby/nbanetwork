const router = require('express').Router()
const { requireUser } = require('../middleware/auth')
const { getAdmin } = require('../lib/supabase')
const { weekAt, validateLineup } = require('../services/fantasy/rules')
const { catalog, playerDetails } = require('../services/fantasy/data')
const uuid = /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i
const fail = (res, error) => { console.warn('Fantasy API:', error.message); res.status(503).json({ error: 'Фентези временно недоступно. Попробуйте ещё раз.' }) }
router.get('/fantasy/players/:id', async (req, res) => {
    if (!/^\d{1,12}$/.test(req.params.id)) return res.status(400).json({ error: 'Некорректный игрок' })
    let week = weekAt()
    if (req.query.week) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.week)) return res.status(400).json({ error: 'Некорректная неделя' })
        const date = new Date(`${req.query.week}T12:00:00Z`)
        if (!Number.isFinite(+date) || date.toISOString().slice(0,10) !== req.query.week || date.getUTCDay() !== 1) return res.status(400).json({ error: 'Некорректная неделя' })
        week = weekAt(date)
    }
    try { res.json(await playerDetails(req.params.id, week)) } catch (error) { fail(res, error) }
})
router.get('/fantasy/players', async (req, res) => {
    try {
        const week = weekAt()
        res.set('Cache-Control', 'no-store').json({ week, players: Date.now() < Date.parse(week.end) ? await catalog(week) : [] })
    } catch (error) { fail(res, error) }
})
router.get('/fantasy', async (req, res) => {
    const user = req.query.profile || null
    const date = req.query.week || weekAt().id
    const dateMs = Date.parse(`${date}T12:00:00Z`)
    if ((user && !uuid.test(user)) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(dateMs) || new Date(dateMs).toISOString().slice(0, 10) !== date || new Date(dateMs).getUTCDay() !== 1) return res.status(400).json({ error: 'Некорректная неделя или профиль' })
    try {
        const { data, error } = await getAdmin().rpc('read_fantasy', { p_week: date, p_user: user }).abortSignal(AbortSignal.timeout(8000))
        if (error) throw error
        res.set('Cache-Control', 'no-store').json({ ...data, week: weekAt(), selectedWeek: date })
    } catch (error) { fail(res, error) }
})
router.post('/fantasy/lineup', requireUser, async (req, res) => {
    const week = weekAt()
    if (req.body?.week !== week.id || Date.now() >= Date.parse(week.end)) return res.status(409).json({ error: 'Приём составов на эту неделю завершён' })
    if (!Array.isArray(req.body.lineup) || req.body.lineup.length !== 5 || req.body.lineup.some(p => !p || typeof p.id !== 'string' || !/^\d+$/.test(p.id) || !['PG','SG','SF','PF','C'].includes(p.slot))) return res.status(400).json({ error: 'Выберите пять игроков по позициям' })
    try {
        const db = getAdmin()
        const { data: existing, error: readError } = await db.from('fantasy_entries').select('week').eq('user_id', req.user.id).eq('week', week.id).maybeSingle()
        if (readError) throw readError
        if (existing) return res.status(409).json({ error: 'Состав на эту неделю уже закреплён' })
        // Recheck injuries against the source, never trust client-provided eligibility.
        const players = await catalog(week, true)
        let lineup
        try { lineup = validateLineup(req.body.lineup, players) } catch (error) { return res.status(400).json({ error: error.message }) }
        const { error } = await db.from('fantasy_entries').insert({ user_id: req.user.id, week: week.id, ends_at: week.end, lineup })
        if (error?.code === '23505') return res.status(409).json({ error: 'Состав на эту неделю уже закреплён' })
        if (error) throw error
        res.status(201).json({ ok: true })
    } catch (error) { fail(res, error) }
})
module.exports = router
