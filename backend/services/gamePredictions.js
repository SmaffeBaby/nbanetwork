const {getAdmin}=require('../lib/supabase')
const {getEspnSummary}=require('./espnGameService')
async function gameContext(id) {
 const raw=await getEspnSummary(id), c=raw.header.competitions[0], type=c.status?.type || {}
 return {id,startsAt:c.date,state:type.state,completed:Boolean(type.completed),canceled:/CANCEL/i.test(type.name || ''),open:type.state==='pre'&&!/CANCEL|POSTPON/i.test(type.name || '')&&Date.now()<Date.parse(c.date)}
}
async function syncPoll(context) {
 const update={starts_at:context.startsAt,state:context.state,checked_at:new Date().toISOString()}
 const admin=getAdmin()
 if(context.completed || context.canceled) {
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
   const {data,error}=await getAdmin().from('game_prediction_polls').select('game_id').is('completed_at',null).lte('starts_at',new Date().toISOString()).order('checked_at').limit(40).abortSignal(AbortSignal.timeout(5000))
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
module.exports={gameContext,readVotes,startPredictionMaintenance}
