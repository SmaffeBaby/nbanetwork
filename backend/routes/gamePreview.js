const router=require('express').Router()
const {requireUser}=require('../middleware/auth')
const {getAdmin}=require('../lib/supabase')
const {normalizeId}=require('../services/games/identity')
const {getGamePreview}=require('../services/gamePreview')
const {gameContext,readVotes}=require('../services/gamePredictions')
function espnId(req) { const id=normalizeId(req.params.gameId);if(!id.startsWith('espn:')) throw new Error('Используйте ESPN ID матча');return id }
router.get('/game-preview/:gameId',async(req,res)=>{
 try {res.set('Cache-Control','no-cache');res.json(await getGamePreview(espnId(req)))}
 catch(error){res.status(503).json({error:error.message || 'Не удалось загрузить предматчевые данные'})}
})
router.get('/game-predictions/:gameId',(req,res,next)=>req.headers.authorization?requireUser(req,res,next):next(),async(req,res)=>{
 try {res.set('Cache-Control','private, no-store');res.json(await readVotes(espnId(req),req.user?.id || null))}
 catch(error){res.status(503).json({error:'Не удалось загрузить голосование'})}
})
router.put('/game-predictions/:gameId',requireUser,async(req,res)=>{
 const side=req.body?.side
 if(side!==null&&!['home','away'].includes(side)) return res.status(400).json({error:'Выберите команду'})
 try {
  const id=espnId(req), context=await gameContext(id)
  if(!context.open) return res.status(409).json({error:'Голосование завершено: матч уже начался или перенесён'})
  const {error}=await getAdmin().rpc('set_game_prediction',{p_game_id:id,p_user_id:req.user.id,p_side:side,p_starts_at:context.startsAt,p_state:context.state}).abortSignal(AbortSignal.timeout(5000))
  if(error) throw error
  res.json(await readVotes(id,req.user.id))
 } catch(error){res.status(503).json({error:error.message || 'Не удалось сохранить голос'})}
})
module.exports=router
