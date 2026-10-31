const {getAdmin}=require('../../lib/supabase')
const {request}=require('./data')
const {getEspnGame}=require('../espnGameService')
const {rateRows}=require('./ratings')
const {seasonAthletes}=require('../gamePreview')
const states=new Map()
const mappings={minutes:'avgMinutes',points:'avgPoints',fieldGoalsAttempted:'avgFieldGoalsAttempted',freeThrowsAttempted:'avgFreeThrowsAttempted',assists:'avgAssists',turnovers:'avgTurnovers',reboundsTotal:'avgRebounds',steals:'avgSteals',blocks:'avgBlocks'}
async function parallel(items,fn,concurrency=3){let cursor=0;await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{while(cursor<items.length){const item=items[cursor++];await fn(item)}}))}
function snapshotGame(id,year,result){
 if(result.meta.status!=='Final')throw new Error('Матч ещё не завершён')
 for(const side of ['home','away']){
  if(!result.players[side]?.length || result.players[side].reduce((sum,p)=>sum+Number(p.statistics.points||0),0)!==Number(result.meta[`${side}Score`]))throw new Error('Неполная статистика матча')
 }
 const players=['home','away'].flatMap(side=>result.players[side].filter(p=>!p.notPlayingReason&&p.statistics.minutes>0).map(p=>{
  if(Object.keys(mappings).some(key=>!Number.isFinite(p.statistics[key])))throw new Error('Неполная статистика игрока')
  return {id:p.personId.replace('espn:',''),position:p.position,stats:Object.fromEntries(Object.keys(mappings).map(k=>[k,p.statistics[k]]))}
 }))
 return {game_id:id,season:year,starts_at:result.dateUTC,matchup:`${result.meta.awayAbbr} — ${result.meta.homeAbbr}`,players}
}
// Reconstruct every league participant's cumulative season, never compare past
// player production against future league totals. Simultaneous starts share a batch.
function reconstruct(games,id,positions={}){
 const totals=new Map(),points=[]
 const sorted=[...games].sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at)||a.game_id.localeCompare(b.game_id))
 for(let cursor=0;cursor<sorted.length;){
  const batch=[],date=sorted[cursor].starts_at
  while(cursor<sorted.length&&sorted[cursor].starts_at===date)batch.push(sorted[cursor++])
  let own=null
  for(const game of batch)for(const p of game.players){
   const row=totals.get(p.id)||{id:p.id,position:positions[p.id]||p.position,stats:{gamesPlayed:0},sums:{}}
   row.stats.gamesPlayed++
   for(const [key,average] of Object.entries(mappings)){row.sums[key]=(row.sums[key]||0)+p.stats[key];row.stats[average]=row.sums[key]/row.stats.gamesPlayed}
   totals.set(p.id,row)
   if(p.id===id)own=game
  }
  if(own){const rating=rateRows([...totals.values()],id)[id];if(rating)points.push({gameId:own.game_id,date:own.starts_at,matchup:own.matchup,game:totals.get(id).stats.gamesPlayed,ovr:rating.ovr})}
 }
 return points
}
async function readGames(year){
 const rows=[]
 for(let offset=0;;offset+=500){
  const {data,error}=await getAdmin().from('fantasy_rating_games').select('game_id,starts_at,matchup,players').eq('season',year).order('starts_at').order('game_id').range(offset,offset+499).abortSignal(AbortSignal.timeout(10000))
  if(error)throw error
  rows.push(...data);if(data.length<500)return rows
 }
}
async function sync(year,state){
 const currentYear=new Date().getUTCFullYear(),probe=year>currentYear?new Date().toISOString().slice(0,10):`${year-1}-11-01`
 const calendar=await request('scoreboard',{dates:probe.replaceAll('-',''),limit:100})
 const dates=calendar.leagues?.[0]?.calendar
 if(!Array.isArray(dates)||!dates.length)throw new Error('Календарь сезона недоступен')
 const now=Date.now(),eligible=dates.filter(d=>Date.parse(d)>=Date.UTC(year-1,6,1)&&Date.parse(d)<Date.UTC(year,6,1)&&Date.parse(d)<=now).map(d=>d.slice(0,10).replaceAll('-',''))
 if(!eligible.length)throw new Error('В календаре нет дат сезона')
 const events=new Map()
 await parallel(eligible,async dates=>{
  const data=await request('scoreboard',{dates,limit:100})
  if(!Array.isArray(data.events))throw new Error('Расписание сезона недоступно')
  for(const e of data.events)if(Number(e.season?.year)===year&&Number(e.season?.type)===2&&e.status?.type?.completed)events.set(`espn:${e.id}`,e)
 })
 const saved=await readGames(year),known=new Set(saved.map(g=>g.game_id))
 state.total=events.size;state.loaded=[...events.keys()].filter(id=>known.has(id)).length
 const errors=[]
 await parallel([...events.keys()].filter(id=>!known.has(id)),async id=>{
  try{
   const row=snapshotGame(id,year,await getEspnGame(id))
   const {error}=await getAdmin().from('fantasy_rating_games').upsert(row,{onConflict:'game_id',ignoreDuplicates:true}).abortSignal(AbortSignal.timeout(10000))
   if(error)throw error;state.loaded++
  }catch(error){errors.push(error);console.warn('Fantasy OVR game:',id,error.message)}
 })
 if(errors.length)throw new Error('Часть матчей ещё не получена. Повторите обновление.')
 const season=await seasonAthletes(year,2)
 state.positions=Object.fromEntries(season.athletes.map(p=>[String(p.athlete.id),p.athlete.position?.abbreviation||'']))
 state.games=(await readGames(year)).filter(g=>events.has(g.game_id))
 state.updatedAt=new Date().toISOString();state.ready=true
}
function history(year,id){
 let state=states.get(year)
 if(!state){state={loaded:0,total:0,ready:false,running:false,error:null};states.set(year,state)}
 const stale=!state.updatedAt||Date.now()-Date.parse(state.updatedAt)>15*60000
 if(stale&&!state.running&&(!state.failedAt||Date.now()-state.failedAt>10000)){
  state.running=true;state.error=null
  void sync(year,state).catch(error=>{state.error=error.message;state.failedAt=Date.now()}).finally(()=>{state.running=false})
 }
 return {season:year,status:state.ready?'ready':state.running?'loading':'error',updating:state.running,loaded:state.loaded,total:state.total,error:state.error,updatedAt:state.updatedAt||null,method:'reconstructed',points:state.ready?reconstruct(state.games,id,state.positions):[]}
}
module.exports={history,reconstruct,snapshotGame}
