const {getAdmin}=require('../lib/supabase')
const {getEspnSummary}=require('./espnGameService')
function predictionOutcome(c) {
 const type=c.status?.type || {}, sides=Object.fromEntries((c.competitors || []).map(team=>[team.homeAway,team]))
 const home=Number(sides.home?.score),away=Number(sides.away?.score)
 const hasScores=[sides.home?.score,sides.away?.score].every(score=>score!=null && String(score).trim()!=='')
 const winner=type.completed && hasScores && Number.isFinite(home) && Number.isFinite(away) && home!==away ? (home>away?'home':'away') : null
 const details={homeName:sides.home?.team?.displayName,homeAbbr:sides.home?.team?.abbreviation,awayName:sides.away?.team?.displayName,awayAbbr:sides.away?.team?.abbreviation,winnerName:winner?sides[winner]?.team?.displayName:null,winnerAbbr:winner?sides[winner]?.team?.abbreviation:null}
 return {winner,details}
}
async function gameContext(id) {
 const raw=await getEspnSummary(id), c=raw.header.competitions[0], type=c.status?.type || {}
 return {id,...predictionOutcome(c),startsAt:c.date,state:type.state,completed:Boolean(type.completed),canceled:/CANCEL/i.test(type.name || ''),open:type.state==='pre'&&!/CANCEL|POSTPON/i.test(type.name || '')&&Date.now()<Date.parse(c.date)}
}
async function syncPoll(context) {
 const update={starts_at:context.startsAt,state:context.state,checked_at:new Date().toISOString()}
 const admin=getAdmin()
 if(context.canceled || (context.completed && context.winner)) {
  const {error}=await admin.rpc('settle_game_prediction',{p_game_id:context.id,p_starts_at:context.startsAt,p_winner_side:context.canceled?null:context.winner,p_details:context.details}).abortSignal(AbortSignal.timeout(5000))
  if(error) throw error
 } else if(context.completed) {
  const {error}=await admin.from('game_prediction_polls').update({...update,completed_at:new Date().toISOString()}).eq('game_id',context.id).is('completed_at',null).abortSignal(AbortSignal.timeout(3000))
  if(error) throw error
 } else {
  const {error}=await admin.from('game_prediction_polls').update(update).eq('game_id',context.id).is('completed_at',null).abortSignal(AbortSignal.timeout(3000))
  if(error) throw error
 }
}
async function readVotes(id,userId=null) {
 const context=await gameContext(id)
 await syncPoll(context)
 const {data,error}=await getAdmin().rpc('read_game_predictions',{p_game_id:id,p_user_id:userId}).abortSignal(AbortSignal.timeout(4000))
 if(error) throw error
 return {...data,open:context.open,startsAt:context.startsAt}
}
function startPredictionMaintenance() {
 let running=false
 async function tick() {
  if(running) return
  running=true
  try {
   const {data,error}=await getAdmin().from('game_prediction_polls').select('game_id').is('result_settled_at',null).lte('starts_at',new Date().toISOString()).order('checked_at').limit(40).abortSignal(AbortSignal.timeout(5000))
   if(error) throw error
   for(const poll of data || []) {
    try {await syncPoll(await gameContext(poll.game_id))} catch(error) {console.warn('Prediction status:',poll.game_id,error.message)}
   }
   const {error:cleanupError}=await getAdmin().rpc('cleanup_game_predictions')
   if(cleanupError) throw cleanupError
  } catch(error) {console.warn('Prediction maintenance:',error.message)}
  finally {running=false}
 }
 void tick()
 setInterval(()=>void tick(),5*60000).unref()
}
module.exports={predictionOutcome,gameContext,readVotes,startPredictionMaintenance}
