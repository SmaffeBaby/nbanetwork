const axios=require('axios'),cache=require('../utils/fetchWithCache')
const ROOT='https://site.api.espn.com/apis/site/v2/sports/basketball/nba'
const aliases={NY:'NYK',GS:'GSW',SA:'SAS',NO:'NOP',UTAH:'UTA',WSH:'WAS',PHO:'PHX',BRK:'BKN'}
const labels={avgPoints:'Очки за матч',avgRebounds:'Подборы за матч',avgOffensiveRebounds:'Подборы в нападении за матч',avgDefensiveRebounds:'Подборы в защите за матч',avgAssists:'Передачи за матч',avgSteals:'Перехваты за матч',avgBlocks:'Блоки за матч',avgTurnovers:'Потери за матч',avgFouls:'Фолы за матч',assistTurnoverRatio:'Передачи / потери',fieldGoalPct:'Точность с игры',twoPointFieldGoalPct:'Точность двухочковых',threePointPct:'Точность трёхочковых',freeThrowPct:'Точность штрафных',avgFieldGoalsMade:'Попадания с игры за матч',avgFieldGoalsAttempted:'Броски с игры за матч',avgTwoPointFieldGoalsMade:'Двухочковые попадания за матч',avgTwoPointFieldGoalsAttempted:'Двухочковые попытки за матч',avgThreePointFieldGoalsMade:'Трёхочковые попадания за матч',avgThreePointFieldGoalsAttempted:'Трёхочковые попытки за матч',avgFreeThrowsMade:'Штрафные попадания за матч',avgFreeThrowsAttempted:'Штрафные попытки за матч',points:'Очки всего',rebounds:'Подборы всего',offensiveRebounds:'Подборы в нападении всего',defensiveRebounds:'Подборы в защите всего',assists:'Передачи всего',steals:'Перехваты всего',blocks:'Блоки всего',turnovers:'Потери всего',fieldGoalsMade:'Попадания с игры всего',fieldGoalsAttempted:'Броски с игры всего',twoPointFieldGoalsMade:'Двухочковые попадания всего',twoPointFieldGoalsAttempted:'Двухочковые попытки всего',threePointFieldGoalsMade:'Трёхочковые попадания всего',threePointFieldGoalsAttempted:'Трёхочковые попытки всего',freeThrowsMade:'Штрафные попадания всего',freeThrowsAttempted:'Штрафные попытки всего',gamesPlayed:'Сыграно матчей',fouls:'Фолы всего',scoringEfficiency:'Очки / попытки с игры',shootingEfficiency:'Эффективный процент с игры (eFG%)',trueShootingPct:'Истинный процент бросков (TS%)'}
const omitted=new Set(['totalRebounds','threePointFieldGoalPct','gamesStarted','minutes','avgMinutes'])
function normalize(data,fallback){
 const team=data.team||fallback,stats={},defs={}
 for(const c of data.results?.stats?.categories||[])for(const s of c.stats||[]){
  if(omitted.has(s.name)||s.value===null||s.value===undefined||String(s.value).trim()===''||!Number.isFinite(Number(s.value)))continue
  stats[s.name]=Number(s.value)*(s.name==='shootingEfficiency'?100:1)
  const group=s.name==='gamesPlayed'?'totals':s.name==='assistTurnoverRatio'||s.name.endsWith('Pct')||s.name.endsWith('Efficiency')?'efficiency':s.name.startsWith('avg')?c.name:'totals'
  defs[s.name]={key:s.name,label:labels[s.name]||s.displayName||s.name,group,percent:s.name.endsWith('Pct')||s.name==='shootingEfficiency',direction:/turnover|foul|ejection|technical|flagrant/i.test(s.name)&&s.name!=='assistTurnoverRatio'?'asc':'desc'}
 }
 if(stats.gamesPlayed>0&&stats.fieldGoalsAttempted+.44*stats.freeThrowsAttempted>0){stats.trueShootingPct=100*stats.points/(2*(stats.fieldGoalsAttempted+.44*stats.freeThrowsAttempted));defs.trueShootingPct={key:'trueShootingPct',label:labels.trueShootingPct,group:'efficiency',percent:true,direction:'desc'}}
 const abbr=aliases[team.abbreviation]||team.abbreviation
 return {team:{id:String(team.id||fallback.id),abbr,name:team.displayName||fallback.displayName,stats,gamesPlayed:stats.gamesPlayed||0,ranks:{}},defs}
}
function attachRanks(teams,metrics,complete){
 for(const team of teams)for(const m of metrics){
  const attempts=m.key==='threePointPct'?'threePointFieldGoalsAttempted':m.key==='twoPointFieldGoalPct'?'twoPointFieldGoalsAttempted':m.key==='freeThrowPct'?'freeThrowsAttempted':m.key==='fieldGoalPct'||m.key==='shootingEfficiency'?'fieldGoalsAttempted':null
  const eligible=teams.filter(t=>t.gamesPlayed>0&&Number.isFinite(t.stats[m.key])&&(!attempts||t.stats[attempts]>0))
  if(!complete||!eligible.includes(team)){team.ranks[m.key]=null;continue}
  const v=Math.round(team.stats[m.key]*1e6),better=t=>m.direction==='asc'?Math.round(t.stats[m.key]*1e6)<v:Math.round(t.stats[m.key]*1e6)>v
  team.ranks[m.key]={place:1+eligible.filter(better).length,total:eligible.length}
 }
 return teams
}
async function directory(){return cache({key:'chart-team-directory',ttl:24*3600000,fetcher:async()=>{
 const {data}=await axios.get(`${ROOT}/teams`,{params:{limit:100},timeout:8000})
 const teams=data.sports?.[0]?.leagues?.[0]?.teams?.map(t=>t.team)
 if(!teams||teams.length!==30||new Set(teams.map(t=>t.id)).size!==30)throw new Error('Неполный список команд НБА')
 return teams
}})}
async function teamSeason(id,year,type){return cache({key:`chart-team:${id}:${year}:${type}`,ttl:15*60000,fetcher:async()=>{
 const {data}=await axios.get(`${ROOT}/teams/${id}/statistics`,{params:{season:year,seasontype:type},timeout:8000})
 const selected=data.requestedSeason||data.season
 if(Number(selected?.year)!==year)throw new Error('Источник вернул другой сезон')
 if(type===3&&selected.qualifiedPostSeason===false&&Number(selected.type)!==3)return {...data,results:{stats:{categories:[]}}}
 if(Number(selected?.type)!==type)throw new Error('Источник вернул другой этап')
 if(!Array.isArray(data.results?.stats?.categories))throw new Error('Статистика команды не опубликована')
 return data
}})}
async function teamChart(year,type){return cache({key:`team-chart-v1:${year}:${type}`,ttl:60000,fetcher:async()=>{
 const teams=await directory(),rows=[],errors=[],defs={},results=await Promise.allSettled(teams.map(t=>teamSeason(t.id,year,type)))
 for(let i=0;i<results.length;i++){const r=results[i];if(r.status==='rejected'){errors.push({id:teams[i].id,abbr:aliases[teams[i].abbreviation]||teams[i].abbreviation});continue}const row=normalize(r.value,teams[i]);rows.push(row.team);Object.assign(defs,row.defs)}
 const metrics=Object.values(defs),complete=errors.length===0
 attachRanks(rows,metrics,complete)
 return {season:year,seasonLabel:`${year-1}–${String(year).slice(-2)}`,type,complete,missingTeams:errors,metrics,teams:rows,updatedAt:new Date().toISOString(),source:'ESPN'}
}})}
module.exports={teamChart,teamSeason,normalize,attachRanks}
