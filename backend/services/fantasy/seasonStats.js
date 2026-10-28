const axios = require('axios')
const fetchWithCache = require('../../utils/fetchWithCache')
const METRICS = ['gamesPlayed','avgPoints','avgRebounds','avgOffensiveRebounds','avgDefensiveRebounds','avgAssists','avgSteals','avgBlocks','avgTurnovers','avgMinutes','twoPointPct','threePointFieldGoalPct','freeThrowPct','avgTwoPointFieldGoalsMade','avgTwoPointFieldGoalsAttempted','avgThreePointFieldGoalsMade','avgThreePointFieldGoalsAttempted','avgFreeThrowsMade','avgFreeThrowsAttempted']
const ATTEMPTS = {twoPointPct:'twoPointFieldGoalsAttempted',threePointFieldGoalPct:'threePointFieldGoalsAttempted',freeThrowPct:'freeThrowsAttempted'}
function normalizeRow(row, categories) {
    const stats = {}
    for (const category of row.categories || []) {
        const names = categories.find(c=>c.name===category.name)?.names || []
        names.forEach((name,i)=> { const v=category.values?.[i]; if(v!=null && String(v).trim()!=='' && Number.isFinite(Number(v))) stats[name]=Number(v) })
    }
    if (stats.fieldGoalsMade != null && stats.threePointFieldGoalsMade != null) stats.twoPointFieldGoalsMade = Math.max(0,stats.fieldGoalsMade-stats.threePointFieldGoalsMade)
    if (stats.fieldGoalsAttempted != null && stats.threePointFieldGoalsAttempted != null) stats.twoPointFieldGoalsAttempted = Math.max(0,stats.fieldGoalsAttempted-stats.threePointFieldGoalsAttempted)
    if (stats.gamesPlayed>0) for(const key of ['twoPointFieldGoalsMade','twoPointFieldGoalsAttempted']) if(stats[key]!=null) stats[`avg${key[0].toUpperCase()}${key.slice(1)}`]=stats[key]/stats.gamesPlayed
    if (stats.twoPointFieldGoalsAttempted>0) stats.twoPointPct=100*stats.twoPointFieldGoalsMade/stats.twoPointFieldGoalsAttempted
    return {id:String(row.athlete.id),stats}
}
function reboundStats(data, year, gamesPlayed) {
    const category = data.categories?.find(c=>c.name==='totals')
    let rows = category?.statistics?.filter(r=>Number(r.season?.year)===year) || []
    // A combined season row supersedes separate team rows after a trade.
    const combined = rows.find(r=>String(r.teamId)==='0' || /^(tot|total|totals)$/i.test(r.teamSlug || ''))
    if(combined) rows=[combined]
    const result={}
    if(!(gamesPlayed>0)) return result
    for(const [key,average] of [['offensiveRebounds','avgOffensiveRebounds'],['defensiveRebounds','avgDefensiveRebounds']]) {
        const index=category?.names?.indexOf(key) ?? -1
        const values=rows.map(r=>r.stats?.[index])
        if(index>=0 && values.length && values.every(v=>v!=null && String(v).trim()!=='' && Number.isFinite(Number(v)))) result[average]=values.reduce((sum,v)=>sum+Number(v),0)/gamesPlayed
    }
    return result
}
async function fullRebounds(id,year,gp) {
    return fetchWithCache({key:`fantasy-rebounds:${year}:${id}`,ttl:15*60000,fetcher:async()=>{
        const {data}=await axios.get(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${id}/stats`,{params:{season:year,seasontype:2},timeout:8000})
        return reboundStats(data,year,gp)
    }})
}
function rankings(player,players) {
    const ranks={}
    for(const key of METRICS) {
        const eligible=players.filter(p=>p.stats.gamesPlayed>0 && p.stats[key]!=null && (!ATTEMPTS[key] || p.stats[ATTEMPTS[key]]>0))
        if(player.stats[key]==null || !(player.stats.gamesPlayed>0) || (ATTEMPTS[key] && !(player.stats[ATTEMPTS[key]]>0))) { ranks[key]=null; continue }
        // Ignore floating point conversion noise, but retain source precision.
        const value=Math.round(player.stats[key]*1e6)
        ranks[key]={place:1+eligible.filter(p=>Math.round(p.stats[key]*1e6)>value).length,total:eligible.length}
    }
    return ranks
}
async function rankFromOrdered(id, ordered, key, value, readStats) {
    const index=ordered.findIndex(p=>p.id===id)
    if(index<0 || value==null) return null
    const target=Math.round(value*1e6)
    let low=0,high=index+1
    // The provider sorts the complete league by the requested rebound metric.
    // Binary search finds the first equal value even for large zero-value ties.
    while(low<high) {
        const mid=Math.floor((low+high)/2)
        const stats=await readStats(ordered[mid])
        if(stats[key]==null) return null
        if(Math.round(stats[key]*1e6)>target) low=mid+1
        else high=mid
    }
    if(low>index) return null
    const first=await readStats(ordered[low])
    if(first[key]==null || Math.round(first[key]*1e6)!==target) return null
    return {place:low+1,total:ordered.length}
}
async function orderedRebounds(year,key) {
    const category=key==='avgOffensiveRebounds'?'offensive':'defensive'
    return fetchWithCache({key:`fantasy-rebound-order:${year}:${key}`,ttl:15*60000,fetcher:async()=>{
        const {data}=await axios.get('https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete',{
            params:{season:year,seasontype:2,category,sort:`${category}.${key}:desc`,limit:1000,isqualified:false},timeout:12000})
        if(Number(data.requestedSeason?.year)!==year || Number(data.requestedSeason?.type?.type)!==2 || !Array.isArray(data.athletes) || Number(data.pagination?.pages)!==1) throw new Error('Incomplete rebound leaderboard')
        return data.athletes.map(row=>normalizeRow(row,data.categories)).filter(p=>p.stats.gamesPlayed>0)
    }})
}
async function seasonPlayerStats(data,id,year) {
    const players=data.athletes.map(row=>normalizeRow(row,data.categories))
    const player=players.find(p=>p.id===id) || {id,stats:{}}
    Object.assign(player.stats,await fullRebounds(id,year,player.stats.gamesPlayed).catch(()=>({})))
    const ranks=rankings(player,players)
    await Promise.all(['avgOffensiveRebounds','avgDefensiveRebounds'].map(async key=>{
        ranks[key]=null
        if(player.stats[key]==null || !(player.stats.gamesPlayed>0)) return
        try {
            const ordered=await orderedRebounds(year,key)
            ranks[key]=await rankFromOrdered(id,ordered,key,player.stats[key],p=>fullRebounds(p.id,year,p.stats.gamesPlayed))
        } catch(error) { console.warn('Fantasy rebound rank:',key,error.message) }
    }))
    return {stats:player.stats,ranks,rankingsUpdating:false,reboundsRankedAt:ranks.avgOffensiveRebounds && ranks.avgDefensiveRebounds?new Date().toISOString():null,rankedAt:new Date().toISOString()}
}
module.exports={seasonPlayerStats,normalizeRow,reboundStats,rankings,rankFromOrdered}
