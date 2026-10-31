const axios=require('axios')
const cache=require('../utils/fetchWithCache')
const draws=require('../constants/nbaCupGroups')
const validAbbrs=new Set(Object.values(require('../constants/teamMap')).map(t=>t.abbr))
const {gameCompetition}=require('./gameCompetition')
const ROOT='https://site.api.espn.com/apis/site/v2/sports/basketball/nba'
const aliases={NY:'NYK',GS:'GSW',SA:'SAS',NO:'NOP',UTAH:'UTA',WSH:'WAS'}
const abbr=t=>aliases[t?.abbreviation]||t?.abbreviation
async function get(path,params,ttl=60000){return cache({key:`cup-source:${path}:${JSON.stringify(params)}`,ttl,fetcher:async()=>{const {data}=await axios.get(`${ROOT}/${path}`,{params,timeout:10000});if(path.endsWith('/schedule'))return {season:data.season,requestedSeason:data.requestedSeason,events:Array.isArray(data.events)?data.events.filter(e=>gameCompetition(e,2)?.kind==='cup'):undefined};if(path==='summary')return {header:data.header};return data}})}
function normalizeEvent(event,fallbackType=2){
 const c=event.competitions?.[0],status=c?.status||event.status,competition=gameCompetition(event,fallbackType)
 if(competition?.kind!=='cup'||!c||!/^\d{9}$/.test(String(event.id)))return null
 const side=s=>{const p=c.competitors?.find(p=>p.homeAway===s);if(!p||!validAbbrs.has(abbr(p.team)))return null;const value=p.score?.value??p.score;return {id:String(p.id||p.team.id),abbr:abbr(p.team),name:p.team.displayName,score:status?.type?.completed&&value!==null&&value!==undefined&&Number.isFinite(Number(value))?Number(value):null}}
 const home=side('home'),away=side('away');if(!home||!away)return null
 return {id:`espn:${event.id}`,date:event.date||c.date,status:status?.type?.completed?'Final':status?.type?.state==='in'?'Live':'Scheduled',completed:Boolean(status?.type?.completed),period:Number(status?.period||0),competition,home,away}
}
function groupTable(teams,games,year){
 const rows=teams.map(team=>({...team,played:0,wins:0,losses:0,points:0,diff:0,statsComplete:true}))
 for(const g of games.filter(g=>g.completed)){
  const home=rows.find(t=>t.abbr===g.home.abbr),away=rows.find(t=>t.abbr===g.away.abbr)
  if(!home||!away||g.home.score===null||g.away.score===null||g.home.score===g.away.score)continue
  home.played++;away.played++;(g.home.score>g.away.score?home:away).wins++;(g.home.score>g.away.score?away:home).losses++
  const ot=year>=2024&&g.period>4
  const h=ot?g.regulation?.home:g.home.score,a=ot?g.regulation?.away:g.away.score
  if(h==null||a==null){home.statsComplete=false;away.statsComplete=false;continue}
  home.points+=h;away.points+=a;home.diff+=ot?0:h-a;away.diff+=ot?0:a-h
 }
 // Head-to-head is applied within tied records only when all mutual games are complete.
 const previous=(a,b)=>Number.isFinite(a.previousWinPct)&&Number.isFinite(b.previousWinPct)?b.previousWinPct-a.previousWinPct:0
 const record=t=>t.played?t.wins/t.played:0
 const tied=t=>rows.filter(x=>x.played>0&&record(x)===record(t))
 const h2h=t=>{const peers=tied(t);const mutual=games.filter(g=>g.completed&&peers.some(p=>p.abbr===g.home.abbr)&&peers.some(p=>p.abbr===g.away.abbr));if(mutual.length!==peers.length*(peers.length-1)/2)return 0;return mutual.filter(g=>(g.home.score>g.away.score?g.home:g.away).abbr===t.abbr).length}
 rows.sort((a,b)=>Number(b.played>0)-Number(a.played>0)||record(b)-record(a)||h2h(b)-h2h(a)||(a.statsComplete&&b.statsComplete?b.diff-a.diff||b.points-a.points||previous(a,b):0)||a.abbr.localeCompare(b.abbr))
 // Do not manufacture an official tiebreak when the published numbers are still tied.
 rows.forEach((t,i)=>{t.place=t.played?1+rows.filter(p=>p.played>0&&(record(p)>record(t)||record(p)===record(t)&&(h2h(p)>h2h(t)||h2h(p)===h2h(t)&&t.statsComplete&&p.statsComplete&&(p.diff>t.diff||p.diff===t.diff&&(p.points>t.points||p.points===t.points&&previous(t,p)>0))))).length:null})
 return rows
}
async function nbaCup(year){return cache({key:`nba-cup-v1:${year}`,ttl:60000,fetcher:async()=>{
 const draw=draws[year];if(!draw)throw new Error('Жеребьёвка этого года пока не опубликована')
 const directory=await get('teams',{limit:100},86400000),teams=directory.sports?.[0]?.leagues?.[0]?.teams?.map(x=>({id:String(x.team.id),abbr:abbr(x.team),name:x.team.displayName}))||[]
 if(teams.length!==30)throw new Error('Неполный список команд')
 try{const previous=await cache({key:`cup-previous-record:${year}`,ttl:86400000,fetcher:async()=>{const {data}=await axios.get('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings',{params:{season:year,type:2},timeout:8000});if(Number(data.season?.year)!==year)throw new Error('Другой сезон');return data}});for(const entry of previous.children?.flatMap(c=>c.standings?.entries||[])||[]){const team=teams.find(t=>t.abbr===abbr(entry.team)),value=entry.stats?.find(s=>s.name==='winPercent')?.value;if(team&&Number.isFinite(value))team.previousWinPct=value}}catch(e){/* Unresolved ties stay tied without the prior-season criterion. */}
 const events=new Map(),errors=[],queue=[...teams]
 await Promise.all(Array.from({length:10},async()=>{while(queue.length){const team=queue.shift();try{const d=await get(`teams/${team.id}/schedule`,{season:year+1,seasontype:2});if(Number((d.requestedSeason||d.season)?.year)!==year+1||!Array.isArray(d.events))throw new Error('Другой сезон');for(const e of d.events){const g=normalizeEvent(e);if(g&&new Date(g.date).getUTCFullYear()===year)events.set(g.id,{game:g,event:e})}}catch(e){errors.push(team.abbr)}}}))
 // The championship is outside the regular schedule; fetch its explicitly published event.
 try{const d=await get('scoreboard',{dates:draw.final,limit:100});if(!Array.isArray(d.events))throw new Error('Нет расписания финала');for(const e of d.events){const g=normalizeEvent(e);if(g?.competition.stage==='final')events.set(g.id,{game:g,event:e})}}catch(e){errors.push('final')}
 const games=[...events.values()].map(x=>x.game).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date))
 // OT points are excluded from group tiebreaks starting in 2024. Summaries supply Q1–Q4.
 await Promise.all(games.filter(g=>g.completed&&g.competition.stage==='group'&&year>=2024&&g.period>4).map(async g=>{try{const d=await get('summary',{event:g.id.slice(5)},86400000);const c=d.header?.competitions?.[0];const total=side=>{const lines=c?.competitors?.find(t=>t.homeAway===side)?.linescores;if(!lines||lines.length<4)return null;const values=lines.slice(0,4).map(x=>Number(x.value??x.displayValue));return values.every(Number.isFinite)?values.reduce((a,b)=>a+b,0):null};g.regulation={home:total('home'),away:total('away')}}catch(e){/* Scores remain visible, tiebreak stats are marked incomplete. */}}))
 const groups=['east','west'].flatMap(conf=>draw[conf].map((list,i)=>{const members=list.split(' '),fixtures=games.filter(g=>g.competition.stage==='group'&&members.includes(g.home.abbr)&&members.includes(g.away.abbr));return {id:`${conf}-${i}`,conference:conf,label:`${conf==='east'?'Восток':'Запад'} · группа ${'ABC'[i]}`,teams:groupTable(members.map(a=>teams.find(t=>t.abbr===a)),fixtures,year),games:fixtures,complete:fixtures.length===10}}))
 const groupGames=games.filter(g=>g.competition.stage==='group'),complete=errors.length===0&&groups.every(g=>g.complete)
 return {year,season:`${year}–${String(year+1).slice(-2)}`,groups,games:games.filter(g=>g.competition.stage!=='group'),complete,missing:errors,groupGameCount:groupGames.length,updatedAt:new Date().toISOString(),drawSource:draw.source}
}})}
module.exports={nbaCup,normalizeEvent,groupTable}
