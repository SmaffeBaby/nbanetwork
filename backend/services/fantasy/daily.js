const { getAdmin } = require('../../lib/supabase')
const { schedule, catalog } = require('./data')
const { dayPeriod, OVR_CAP, score } = require('./rules')
const { rateSeason, seasonYear } = require('./ratings')
const { seasonAthletes } = require('../gamePreview')
const { getEspnGame } = require('../espnGameService')
const pending = new Map()
async function readDay(id) {
    const { data, error } = await getAdmin().from('fantasy_days').select('*').eq('day',id).maybeSingle().abortSignal(AbortSignal.timeout(8000))
    if (error) throw error
    return data
}
async function slate(id) {
    const existing = await readDay(id)
    if (existing) return existing
    if (pending.has(id)) return pending.get(id)
    const task = (async()=>{
        const period = dayPeriod(id), games = await schedule(period)
        if (!games.length) return null
        const lock = games.reduce((min,g)=>Math.min(min,Date.parse(g.start)),Infinity)
        // Never create a historical rating from information learned after tip-off.
        if (Date.now()>=lock) return null
        const year = seasonYear(id)
        const [players, stats] = await Promise.all([catalog(period),seasonAthletes(year,2)])
        const ratings = rateSeason(stats)
        const snapshot = Object.fromEntries(players.map(p=>[p.id,{
            id:p.id,name:p.name,team:p.team,positions:p.positions,scoringPosition:p.positions[0],
            ...(ratings[p.id] || {ovr:80,gamesPlayed:0,confidence:0,components:[]})
        }]))
        const row = {day:id,starts_at:period.start,ends_at:period.end,locks_at:new Date(lock).toISOString(),season:year,ratings:snapshot}
        const { error } = await getAdmin().from('fantasy_days').upsert(row,{onConflict:'day',ignoreDuplicates:true})
        if (error) throw error
        return readDay(id)
    })().finally(()=>pending.delete(id))
    pending.set(id,task)
    return task
}
async function dayInfo(id, fresh = false) {
    const period = dayPeriod(id)
    const [saved, games] = await Promise.all([slate(id),schedule(period)])
    const lock = Math.min(saved ? Date.parse(saved.locks_at) : Infinity,...games.map(g=>Date.parse(g.start)))
    const open = !!saved && games.length>0 && Date.now()<lock
    const players = open ? (await catalog(period,fresh)).filter(p=>saved.ratings[p.id] && saved.ratings[p.id].team===p.team).map(p=>({...p,...saved.ratings[p.id]})) : []
    return {day:{...period,locksAt:Number.isFinite(lock)?new Date(lock).toISOString():period.start,hasGames:games.length>0,open},players,ovrCap:OVR_CAP,ratingAt:saved?.created_at || null,season:saved?.season || seasonYear(id)}
}
let syncing = false
async function syncDaily() {
    if (syncing) return
    syncing=true
    try {
        const db=getAdmin()
        const {data:days,error}=await db.from('fantasy_days').select('day,ratings,ends_at').is('settled_at',null).lte('locks_at',new Date().toISOString()).order('day')
        if(error) throw error
        for(const day of days) {
            const {count,error:entryError}=await db.from('fantasy_daily_entries').select('user_id',{count:'exact',head:true}).eq('day',day.day)
            if(entryError) throw entryError
            if(!count) continue
            const period=dayPeriod(day.day), games=await schedule(period)
            const {data:existing,error:readError}=await db.from('fantasy_daily_scores').select('game_id').eq('day',day.day)
            if(readError) throw readError
            const done=new Set(existing.map(s=>s.game_id))
            for(const game of games.filter(g=>g.completed && !done.has(`espn:${g.id}`))) {
                let result
                try { result=await getEspnGame(`espn:${game.id}`) } catch(error) {console.warn('Daily fantasy game:',game.id,error.message);continue}
                const rows=buildDailyRows(day,game,result)
                if(rows.length) {
                    const {error:writeError}=await db.from('fantasy_daily_scores').upsert(rows,{onConflict:'day,game_id,player_id'})
                    if(writeError) throw writeError
                    done.add(`espn:${game.id}`)
                }
            }
            if(Date.now()>Date.parse(day.ends_at) && games.every(g=>g.completed && done.has(`espn:${g.id}`))) {
                const {error:settleError}=await db.from('fantasy_days').update({settled_at:new Date().toISOString()}).eq('day',day.day)
                if(settleError) throw settleError
            }
        }
    } finally { syncing=false }
}
function buildDailyRows(day,game,result) {
    const period=dayPeriod(day.day), start=Date.parse(game.start)
    if(start<Date.parse(period.start) || start>=Date.parse(period.end) || result.meta.status!=='Final' ||
        ['home','away'].some(side=>!result.players[side]?.length || result.players[side].reduce((sum,p)=>sum+Number(p.statistics.points || 0),0)!==Number(result.meta[`${side}Score`]))) return []
    const rows=[]
    for(const side of ['home','away']) for(const p of result.players[side]) {
        if(p.notPlayingReason || !(p.statistics.minutes>0)) continue
        const id=p.personId.replace('espn:',''), position=day.ratings[id]?.scoringPosition || p.position || 'SF'
        const won=side==='home'?result.meta.homeScore>result.meta.awayScore:result.meta.awayScore>result.meta.homeScore
        rows.push({day:day.day,game_id:`espn:${game.id}`,player_id:id,starts_at:game.start,points:score(p.statistics,won,position),stats:{...p.statistics,won,scoringPosition:position,scoringVersion:2,homeAbbr:result.meta.homeAbbr,awayAbbr:result.meta.awayAbbr}})
    }
    return rows
}
module.exports={slate,dayInfo,syncDaily,buildDailyRows}
