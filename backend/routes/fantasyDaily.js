const { getAdmin } = require('../lib/supabase')
const { dayAt,dayPeriod,DAY,validateDailyLineup } = require('../services/fantasy/rules')
const { dayInfo } = require('../services/fantasy/daily')
const { schedule,playerDetails } = require('../services/fantasy/data')
const uuid=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i
const fail=(res,error)=>{console.warn('Daily fantasy:',error.message);res.status(503).json({error:'Фентези временно недоступно. Попробуйте ещё раз.'})}
function params(req) {
    const mode=req.query.mode || 'unlimited', profile=req.query.profile || null
    if(!['unlimited','balanced'].includes(mode) || (profile && !uuid.test(profile))) throw new Error('Некорректный режим или профиль')
    const day=req.query.day ? dayPeriod(req.query.day).id : null
    if(day && Date.parse(day)>Date.parse(dayAt().id)+7*DAY) throw new Error('Выберите дату в ближайшие 7 дней')
    return {mode,profile,day}
}
async function defaultDay() {
    const today=dayAt()
    // Prefer the next playable day rather than a slate whose first tip has passed.
    for(let i=0;i<4;i++) {
        const day=dayAt(new Date(Date.parse(today.start)+i*DAY))
        const games=await schedule(day)
        if(games.length && games.every(g=>Date.parse(g.start)>Date.now())) return day.id
    }
    return today.id
}
async function getBoard(req,res) {
    let p
    try {p=params(req)} catch(error) {return res.status(400).json({error:error.message})}
    try {
        const id=p.day || await defaultDay(), info=await dayInfo(id)
        const db=getAdmin()
        const [daily,legacy]=await Promise.all([
            db.rpc('read_daily_fantasy',{p_day:id,p_mode:p.mode,p_user:p.profile}).abortSignal(AbortSignal.timeout(10000)),
            p.profile?db.rpc('read_fantasy',{p_week:id,p_user:p.profile}).abortSignal(AbortSignal.timeout(10000)):Promise.resolve({data:{history:[]}})
        ])
        if(daily.error || legacy.error) throw daily.error || legacy.error
        res.set('Cache-Control','no-store').json({...daily.data,...info,week:info.day,selectedWeek:id,mode:p.mode,
            history:[...daily.data.history,...legacy.data.history.map(e=>({...e,mode:'legacy'}))].sort((a,b)=>b.week.localeCompare(a.week))})
    } catch(error) {fail(res,error)}
}
async function getPlayers(req,res) {
    let p
    try {p=params(req)} catch(error) {return res.status(400).json({error:error.message})}
    try {res.set('Cache-Control','no-store').json(await dayInfo(p.day || await defaultDay()))} catch(error) {fail(res,error)}
}
async function details(req,res) {
    let p
    try {p=params(req);if(!/^\d{1,12}$/.test(req.params.id)) throw new Error('Некорректный игрок')} catch(error) {return res.status(400).json({error:error.message})}
    try {res.set('Cache-Control','no-store').json(await playerDetails(req.params.id,dayPeriod(p.day || await defaultDay()),p.profile,p.mode))} catch(error) {fail(res,error)}
}
async function save(req,res) {
    let period
    try {period=dayPeriod(req.body?.day);if(Date.parse(period.id)>Date.parse(dayAt().id)+7*DAY) throw new Error('Выберите дату в ближайшие 7 дней')} catch(error) {return res.status(400).json({error:error.message})}
    try {
        const info=await dayInfo(period.id,true)
        if(!info.day.open) return res.status(409).json({error:'Приём составов завершён или в этот день нет игр'})
        let lineup
        try {lineup=validateDailyLineup(req.body?.lineup,info.players,req.body?.mode)} catch(error) {return res.status(400).json({error:error.message})}
        const {error}=await getAdmin().from('fantasy_daily_entries').insert({user_id:req.user.id,day:period.id,mode:req.body.mode,lineup})
        if(error?.code==='23505') return res.status(409).json({error:'Состав на этот день и режим уже закреплён'})
        if(error?.code==='P0001') return res.status(409).json({error:'Приём составов завершён. Обновите страницу.'})
        if(error) throw error
        res.status(201).json({ok:true})
    } catch(error) {fail(res,error)}
}
module.exports={getBoard,getPlayers,details,save}
