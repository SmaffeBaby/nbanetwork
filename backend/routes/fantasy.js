const router = require('express').Router()
const { requireUser } = require('../middleware/auth')
const { getAdmin } = require('../lib/supabase')
const { weekAt } = require('../services/fantasy/rules')
const { playerDetails } = require('../services/fantasy/data')
const uuid = /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i
const fail = (res, error) => { console.warn('Fantasy API:', error.message); res.status(503).json({ error: 'Фентези временно недоступно. Попробуйте ещё раз.' }) }
const daily = require('./fantasyDaily')
router.get('/fantasy/profiles/:id',async(req,res)=>{
    if(!uuid.test(req.params.id))return res.status(400).json({error:'Некорректный профиль'})
    try {
        const {data,error}=await getAdmin().rpc('read_fantasy_profile',{p_user:req.params.id}).abortSignal(AbortSignal.timeout(10000))
        if(error)throw error
        res.set('Cache-Control','no-store').json({...data,history:[...data.history,...data.legacy.map(e=>({...e,mode:'legacy'}))].sort((a,b)=>b.week.localeCompare(a.week))})
    }catch(error){fail(res,error)}
})
router.get('/fantasy/players/:id/rating-history', (req,res)=>{
    const year=Number(req.query.season)
    if(!/^\d{1,12}$/.test(req.params.id)||!Number.isInteger(year)||year<2026||year>new Date().getUTCFullYear()+1)return res.status(400).json({error:'Некорректный игрок или сезон'})
    const result=require('../services/fantasy/ratingHistory').history(year,req.params.id)
    res.set('Cache-Control','no-store').status(result.status==='loading'?202:result.status==='error'?503:200).json(result)
})
router.get('/fantasy/players/:id', async (req, res) => {
    if (!req.query.week) return daily.details(req,res)
    if (!/^\d{1,12}$/.test(req.params.id)) return res.status(400).json({ error: 'Некорректный игрок' })
    if (req.query.profile && !uuid.test(req.query.profile)) return res.status(400).json({ error: 'Некорректный профиль' })
    let week = weekAt()
    if (req.query.week) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.week)) return res.status(400).json({ error: 'Некорректная неделя' })
        const date = new Date(`${req.query.week}T12:00:00Z`)
        if (!Number.isFinite(+date) || date.toISOString().slice(0,10) !== req.query.week || date.getUTCDay() !== 1) return res.status(400).json({ error: 'Некорректная неделя' })
        week = weekAt(date)
    }
    try { res.json(await playerDetails(req.params.id, week, req.query.profile)) } catch (error) { fail(res, error) }
})
router.get('/fantasy/players', daily.getPlayers)
router.get('/fantasy', async (req, res) => {
    if (!req.query.week) return daily.getBoard(req,res)
    const user = req.query.profile || null
    const date = req.query.week || weekAt().id
    const dateMs = Date.parse(`${date}T12:00:00Z`)
    if ((user && !uuid.test(user)) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(dateMs) || new Date(dateMs).toISOString().slice(0, 10) !== date || new Date(dateMs).getUTCDay() !== 1) return res.status(400).json({ error: 'Некорректная неделя или профиль' })
    try {
        const { data, error } = await getAdmin().rpc('read_fantasy', { p_week: date, p_user: user }).abortSignal(AbortSignal.timeout(8000))
        if (error) throw error
        res.set('Cache-Control', 'no-store').json({ ...data, week: weekAt(new Date(`${date}T12:00:00Z`)), selectedWeek: date })
    } catch (error) { fail(res, error) }
})
router.post('/fantasy/lineup', requireUser, daily.save)
module.exports = router
