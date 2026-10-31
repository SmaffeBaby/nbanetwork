const {getAdmin}=require('../lib/supabase')
const {getEspnGame}=require('./espnGameService')
const {dayAt,DAY}=require('./fantasy/rules')
const {schedule}=require('./fantasy/data')
const cache=require('../utils/fetchWithCache')
const canonical=id=>/^(?:espn:)?\d{9}$/.test(String(id))?`espn:${String(id).replace('espn:','')}`:null
function resultPayload(result){
 const m=result.meta
 if(m.status!=='Final'||![m.homeScore,m.awayScore].every(s=>s!==null&&s!==undefined&&String(s).trim()!==''&&Number.isFinite(Number(s)))||Number(m.homeScore)===Number(m.awayScore))return null
 return {homeAbbr:m.homeAbbr,awayAbbr:m.awayAbbr,matchup:`${m.awayAbbr} — ${m.homeAbbr}`,homeScore:Number(m.homeScore),awayScore:Number(m.awayScore),winnerAbbr:Number(m.homeScore)>Number(m.awayScore)?m.homeAbbr:m.awayAbbr}
}
let running=false
async function syncNotifications(){
 if(running)return
 running=true
 try{
  const db=getAdmin(),subscribers=[]
  for(let offset=0;;offset+=500){
   const {data,error}=await db.from('notification_preferences').select('user_id,results_since,result_favorites,result_teams,result_predictions,profiles:user_id(favorites_games,favorites_teams)').eq('game_results',true).range(offset,offset+499).abortSignal(AbortSignal.timeout(8000))
   if(error)throw error;subscribers.push(...data);if(data.length<500)break
  }
  if(!subscribers.length)return
  const candidates=new Map()
  for(const n of subscribers){
   const p=Array.isArray(n.profiles)?n.profiles[0]:n.profiles
   if(n.result_favorites)for(const g of p?.favorites_games||[]){const id=canonical(g.id),date=g.dateUTC||g.date;if(id&&Number.isFinite(Date.parse(date))&&Date.parse(date)>=Date.parse(n.results_since))candidates.set(id,{game_id:id,starts_at:new Date(date).toISOString()})}
  }
  const voters=subscribers.filter(n=>n.result_predictions)
  for(let offset=0;offset<voters.length;offset+=200){
   const users=voters.slice(offset,offset+200),earliest=users.reduce((min,n)=>Math.min(min,Date.parse(n.results_since)),Infinity)
   for(let page=0;;page+=500){
    const {data,error}=await db.from('game_predictions').select('user_id,game_id,poll:game_id(starts_at)').in('user_id',users.map(n=>n.user_id)).range(page,page+499).abortSignal(AbortSignal.timeout(8000))
    if(error)throw error
    for(const row of data){const poll=Array.isArray(row.poll)?row.poll[0]:row.poll;if(poll&&Date.parse(poll.starts_at)>=earliest)candidates.set(row.game_id,{game_id:row.game_id,starts_at:poll.starts_at})}
    if(data.length<500)break
   }
  }
  const profileOf=n=>Array.isArray(n.profiles)?n.profiles[0]:n.profiles
  const teams=subscribers.filter(n=>n.result_teams&&profileOf(n)?.favorites_teams?.length)
  if(teams.length){
   const watchedTeams=new Set(teams.flatMap(n=>profileOf(n).favorites_teams))
   const earliest=Math.max(Date.now()-14*DAY,Math.min(...teams.map(n=>Date.parse(n.results_since))))
   const start=Date.parse(dayAt(new Date(earliest)).start)
   for(let date=start;date<=Date.now()+DAY;date+=DAY){
    const day=dayAt(new Date(date)),games=await cache({key:`notification-schedule:${day.id}`,ttl:Date.now()-Date.parse(day.end)>DAY?6*3600000:60000,fetcher:()=>schedule(day)})
    for(const g of games)if(Date.parse(g.start)>=earliest&&g.teams.some(t=>watchedTeams.has(t.abbr)))candidates.set(`espn:${g.id}`,{game_id:`espn:${g.id}`,starts_at:g.start})
   }
  }
  const rows=[...candidates.values()]
  for(let i=0;i<rows.length;i+=200){const {error}=await db.from('notification_game_watches').upsert(rows.slice(i,i+200),{onConflict:'game_id',ignoreDuplicates:true});if(error)throw error}
  const cutoff=new Date(Date.now()-120000).toISOString()
  const {data:pending,error}=await db.from('notification_game_watches').select('game_id').is('finished_at',null).lte('starts_at',new Date().toISOString()).or(`checked_at.is.null,checked_at.lt.${cutoff}`).order('checked_at',{nullsFirst:true}).limit(40).abortSignal(AbortSignal.timeout(8000))
  if(error)throw error
  for(const row of pending){
   try{
    const result=await getEspnGame(row.game_id),payload=resultPayload(result)
    if(payload){const {error:e}=await db.rpc('publish_notification_result',{p_game:row.game_id,p_start:result.dateUTC,p_payload:payload}).abortSignal(AbortSignal.timeout(8000));if(e)throw e}
    else{const {error:e}=await db.from('notification_game_watches').update({checked_at:new Date().toISOString(),starts_at:result.dateUTC,...(result.meta.status==='Cancelled'?{finished_at:new Date().toISOString()}:{})}).eq('game_id',row.game_id);if(e)throw e}
   }catch(error){console.warn('Notification game:',row.game_id,error.message);await db.from('notification_game_watches').update({checked_at:new Date().toISOString()}).eq('game_id',row.game_id)}
  }
 }finally{running=false}
}
function startNotificationMaintenance(){const tick=()=>void syncNotifications().catch(error=>console.warn('Notification maintenance:',error.message));tick();setInterval(tick,60000).unref()}
module.exports={syncNotifications,startNotificationMaintenance,resultPayload}
