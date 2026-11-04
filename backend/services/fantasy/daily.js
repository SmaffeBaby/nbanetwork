const { getAdmin } = require('../../lib/supabase')
const { schedule, catalog } = require('./data')
const { dayPeriod, OVR_CAP, score } = require('./rules')
const { seasonRatings, seasonYear, RATING_VERSION } = require('./ratings')
const { getEspnGame } = require('../espnGameService')
const pending = new Map()
async function readDay(id) {
    const { data, error } = await getAdmin().from('fantasy_days').select('*').eq('day',id).maybeSingle().abortSignal(AbortSignal.timeout(8000))
    if (error) throw error
    return data
}
function entryWindow(games, ratings, now = Date.now()) {
    const firstByTeam = new Map()
    for (const game of games) for (const team of game.teams) {
        const start = Date.parse(game.start)
        const previous = firstByTeam.get(team.abbr)
        if (!previous || start < previous.start) firstByTeam.set(team.abbr, {start, started:game.started || game.completed})
    }
    const playerLocks = Object.fromEntries(Object.entries(ratings).flatMap(([id,player]) => {
        const game = firstByTeam.get(player.team)
        return game && !game.started && game.start > now ? [[id,new Date(game.start).toISOString()]] : []
    }))
    return { locksAt: games.length ? new Date(Math.max(...games.map(g=>Date.parse(g.start)))).toISOString() : null, playerLocks }
}
async function refreshWindow(saved, games) {
    const window = entryWindow(games,saved.ratings)
    if (!window.locksAt) return {...saved,player_locks:{}}
    const patch = {locks_at:window.locksAt,player_locks:window.playerLocks}
    const {error} = await getAdmin().from('fantasy_days').update(patch).eq('day',saved.day)
    if (error) throw error
    return {...saved,...patch}
}
const unrated = {version:RATING_VERSION,ovr:80,gamesPlayed:0,confidence:0,components:[]}

async function upgradeRatings(saved, games) {
    if (saved.rating_version >= RATING_VERSION || saved.settled_at || !games.length) return saved
    const firstTipoff = Math.min(...games.map(g => Date.parse(g.start)))
    if (firstTipoff <= Date.now() || games.some(g => g.started || g.completed)) return saved
    const model = await seasonRatings(saved.season)
    const ratings = Object.fromEntries(Object.entries(saved.ratings).map(([id, player]) => [
        id, {...player,...(model[id] || unrated)}
    ]))
    const {data, error} = await getAdmin().rpc('upgrade_fantasy_ratings',{
        p_day:saved.day,p_ratings:ratings,p_first_tipoff:new Date(firstTipoff).toISOString()
    }).abortSignal(AbortSignal.timeout(10000))
    if (error) throw error
    return data ? {...saved,ratings,rating_version:RATING_VERSION} : readDay(saved.day)
}

async function slate(id) {
    const existing = await readDay(id)
    if (existing) {
        const games = await schedule(dayPeriod(id))
        return refreshWindow(await upgradeRatings(existing,games),games)
    }
    if (pending.has(id)) return pending.get(id)
    const task = (async()=>{
        const period = dayPeriod(id), games = await schedule(period)
        if (!games.length) return null
        // Late entry is allowed only for teams whose first game is still ahead.
        const eligibleTeams = new Set(games.filter(g=>!g.started && !g.completed && Date.parse(g.start)>Date.now()).flatMap(g=>g.teams.map(t=>t.abbr)))
        if (!eligibleTeams.size) return null
        const year = seasonYear(id)
        const [players, ratings] = await Promise.all([catalog(period),seasonRatings(year)])
        const snapshot = Object.fromEntries(players.filter(p=>eligibleTeams.has(p.team)).map(p=>[p.id,{
            id:p.id,name:p.name,team:p.team,positions:p.positions,scoringPosition:p.positions[0],
            ...(ratings[p.id] || unrated)
        }]))
        const window = entryWindow(games,snapshot)
        if (!Object.keys(window.playerLocks).length) return null
        const row = {day:id,starts_at:period.start,ends_at:period.end,locks_at:window.locksAt,player_locks:window.playerLocks,season:year,rating_version:RATING_VERSION,ratings:snapshot}
        const { error } = await getAdmin().from('fantasy_days').upsert(row,{onConflict:'day',ignoreDuplicates:true})
        if (error) throw error
        return refreshWindow(await readDay(id),games)
    })().finally(()=>pending.delete(id))
    pending.set(id,task)
    return task
}
async function dayInfo(id, fresh = false) {
    const period = dayPeriod(id)
    const [saved, games] = await Promise.all([slate(id),schedule(period)])
    const lock = saved ? Date.parse(saved.locks_at) : Math.max(...games.map(g=>Date.parse(g.start)))
    const open = !!saved && games.length>0 && Date.now()<lock && Object.values(saved.player_locks || {}).some(t=>Date.parse(t)>Date.now())
    // Older frozen slates can display a forecast without changing their OVR.
    const forecasts = open && saved.rating_version === 1 ? await seasonRatings(saved.season).catch(() => null) : null
    const players = open ? (await catalog(period,fresh)).filter(p=>saved.ratings[p.id] && saved.ratings[p.id].team===p.team && Date.parse(saved.player_locks[p.id])>Date.now()).map(p=>({...p,...saved.ratings[p.id],projectedOvr:saved.ratings[p.id].projectedOvr ?? forecasts?.[p.id]?.projectedOvr})) : []
    return {day:{...period,locksAt:Number.isFinite(lock)?new Date(lock).toISOString():period.start,hasGames:games.length>0,open},players,ovrCap:OVR_CAP,ratingAt:saved?.created_at || null,season:saved?.season || seasonYear(id)}
}
let upgrading = false
async function upgradeUpcomingRatings() {
    if (upgrading) return
    upgrading = true
    try {
        const {data, error} = await getAdmin().from('fantasy_days').select('*')
            .lt('rating_version',RATING_VERSION).is('settled_at',null).gt('locks_at',new Date().toISOString())
            .abortSignal(AbortSignal.timeout(8000))
        if (error) throw error
        for (const saved of data) {
            try {
                await upgradeRatings(saved,await schedule(dayPeriod(saved.day)))
            } catch (error) {
                console.warn('Fantasy rating upgrade:',saved.day,error.message)
            }
        }
    } finally { upgrading = false }
}
let syncing = false
async function syncDaily() {
    if (syncing) return
    syncing=true
    try {
        const db=getAdmin()
        const {data:days,error}=await db.from('fantasy_days').select('day,ratings,ends_at').is('settled_at',null).lte('starts_at',new Date().toISOString()).order('day')
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
module.exports={slate,dayInfo,syncDaily,upgradeUpcomingRatings,buildDailyRows,entryWindow}
