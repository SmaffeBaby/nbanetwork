const axios = require('axios')
const cache = require('../utils/fetchWithCache')
const { getEspnSummary, normalizeSummary } = require('./espnGameService')
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba'
const unavailable = status => /^(out|doubtful|suspension|suspended|inactive)$/i.test(status || '')
function athlete(a) {
    return { id:String(a.id), name:a.displayName || a.fullName || '', image:a.headshot?.href || `https://a.espncdn.com/i/headshots/nba/players/full/${a.id}.png`, position:a.position?.abbreviation || '' }
}
function seasonMatches(data, year) { return Number(data?.season?.year) === Number(year) }
async function teamResource(team, resource, year, type, ttl) {
    return cache({key:`preview:${team}:${resource}:${year}:${type}`,ttl,fetcher:async()=>{
        const {data} = await axios.get(`${BASE}/teams/${team}/${resource}`,{params:{season:year,seasontype:type},timeout:8000})
        if (!seasonMatches(data, year)) throw new Error('ESPN вернул другой сезон')
        if (resource === 'statistics' && Number(data.season.type) !== Number(type)) throw new Error('ESPN вернул другой этап сезона')
        return data
    }})
}
async function seasonAthletes(year, type) {
    return cache({key:`preview:athletes:${year}:${type}`,ttl:15*60000,fetcher:async()=>{
        const {data} = await axios.get('https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete',{
            params:{season:year,seasontype:type,limit:1000,isqualified:false,region:'us',lang:'en'},timeout:10000})
        if(Number(data.requestedSeason?.year || data.requestedSeason?.season || data.currentSeason?.year)!==Number(year)) throw new Error('Статистика другого сезона')
        if(Number(data.requestedSeason?.type?.type || data.requestedSeason?.type?.id || data.currentSeason?.type?.type)!==Number(type)) throw new Error('Статистика другого этапа сезона')
        if(!Array.isArray(data.athletes) || Number(data.pagination?.pages)>1) throw new Error('Неполная статистика игроков')
        return data
    }})
}
function injuryReports(raw, teamId, roster, depth) {
    const reports = new Map()
    const add = (a,injury) => {
        if(!a?.id || !injury?.status || /^(active|healthy)$/i.test(injury.status)) return
        reports.set(String(a.id),{...athlete(a),status:injury.status,
            availability:unavailable(injury.status)?'out':'uncertain',
            detail:[injury.details?.type,injury.details?.detail].filter(Boolean).join(' · '),updatedAt:injury.date || null})
    }
    for(const a of roster?.athletes || []) for(const i of a.injuries || []) add(a,i)
    for(const position of Object.values(depth?.depthchart?.[0]?.positions || {})) for(const a of position.athletes || []) for(const i of a.injuries || []) add(a,i)
    for(const group of raw.injuries || []) if(String(group.team?.id)===String(teamId)) for(const i of group.injuries || []) add(i.athlete,i)
    return [...reports.values()]
}
function lineup(raw, teamId, depth, injuries) {
    const confirmed = raw.boxscore?.players?.find(g=>String(g.team.id)===String(teamId))?.statistics?.flatMap(g=>g.athletes || []).filter(row=>row.starter)
    if(confirmed?.length===5 && new Set(confirmed.map(r=>r.athlete.id)).size===5) return {kind:'confirmed',players:confirmed.map(row=>athlete(row.athlete))}
    const used=new Set(), blocked=new Set(injuries.filter(i=>i.availability==='out').map(i=>i.id))
    const players=['pg','sg','sf','pf','c'].map(position=>{
        const a=depth?.depthchart?.[0]?.positions?.[position]?.athletes?.find(a=>!used.has(String(a.id))&&!blocked.has(String(a.id)))
        if(!a) return {id:null,name:'Пока не определён',position:position.toUpperCase(),image:null}
        used.add(String(a.id));return {...athlete(a),position:position.toUpperCase(),status:injuries.find(i=>i.id===String(a.id))?.status || null}
    })
    return {kind:'projected',players}
}
function teamStats(data) {
    const stats=Object.fromEntries((data?.results?.stats?.categories || []).flatMap(c=>c.stats || []).map(s=>[s.name,s]))
    const played=stats.gamesPlayed?.value==null?null:Number(stats.gamesPlayed.value)
    return {gamesPlayed:played,values:['avgPoints','avgRebounds','avgAssists','avgSteals','avgBlocks','fieldGoalPct','threePointPct','freeThrowPct'].map(key=>({key,value:played>0 && stats[key]?.value!=null && Number.isFinite(Number(stats[key].value)) ? Number(stats[key].value):null}))}
}
function teamLeaders(data, roster) {
    const ids=new Set((roster?.athletes || []).map(a=>String(a.id)))
    const players=(data?.athletes || []).filter(row=>ids.has(String(row.athlete.id))).map(row=>{
        const stats={}
        for(const category of row.categories || []) {
            const names=data.categories?.find(c=>c.name===category.name)?.names || []
            names.forEach((name,i)=>{if(category.values?.[i]!=null) stats[name]=Number(category.values[i])})
        }
        return {...athlete(row.athlete),stats}
    }).filter(a=>a.stats.gamesPlayed>0)
    return ['avgPoints','avgRebounds','avgSteals'].map(key=>({key,players:players.filter(p=>Number.isFinite(p.stats[key])).sort((a,b)=>b.stats[key]-a.stats[key] || a.name.localeCompare(b.name)).slice(0,3).map(p=>({...p,value:p.stats[key],stats:undefined}))}))
}
async function getGamePreview(id) {
    const raw=await getEspnSummary(id), recap=normalizeSummary(id,raw), competition=raw.header.competitions[0]
    const year=Number(raw.header.season.year), type=Number(raw.header.season.type), state=competition.status?.type || {}
    if(state.state!=='pre') return {gameId:id,source:'espn',state:state.state,completed:Boolean(state.completed),teams:[]}
    const commonRequest=seasonAthletes(year,type).catch(()=>null)
    const teams=await Promise.all(['away','home'].map(async side=>{
        const c=competition.competitors.find(c=>c.homeAway===side)
        const results=await Promise.allSettled(['roster','depthcharts','statistics'].map(resource=>teamResource(c.id,resource,year,type,resource==='depthcharts'?5*60000:15*60000)))
        const common=await commonRequest
        const [roster,depth,stats]=results.map(r=>r.status==='fulfilled'?r.value:null)
        const injuries=injuryReports(raw,c.id,roster,depth)
        return {side,id:String(c.id),name:c.team.displayName,abbr:side==='home'?recap.meta.homeAbbr:recap.meta.awayAbbr,
            record:c.record?.find(r=>r.type==='total')?.summary || '',lineup:lineup(raw,c.id,depth,injuries),injuries,
            statistics:teamStats(stats),leaders:teamLeaders(common,roster),
            unavailable:[...['roster','depthcharts','statistics'].filter((_,i)=>results[i].status==='rejected'),...(!common?['leaders']:[])]}
    }))
    return {gameId:id,source:'espn',dateUTC:recap.dateUTC,dateMSK:recap.dateMSK,venue:recap.venue,
        season:`${year-1}-${String(year).slice(-2)}`,seasonType:type,state:state.state || 'pre',completed:Boolean(state.completed),statusName:state.name || '',
        status:recap.meta.status,votingOpen:state.state==='pre'&&!/CANCEL|POSTPON/i.test(state.name || '')&&Date.now()<Date.parse(recap.dateUTC),
        teams,updatedAt:new Date().toISOString()}
}
module.exports={seasonAthletes,getGamePreview,injuryReports,lineup,teamStats,teamLeaders}
