const router=require('express').Router()
const {requireUser}=require('../middleware/auth')
const {getAdmin}=require('../lib/supabase')
const uuid=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i
const bools=['activity','game_comments','articles','article_comments','fantasy','game_results','result_favorites','result_teams','result_predictions']
function validatePreferences(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>![...bools,'actor_mode','actor_ids'].includes(k))||bools.some(k=>typeof value[k]!=='boolean')||!['all','selected'].includes(value.actor_mode)||!Array.isArray(value.actor_ids)||value.actor_ids.length>1000||value.actor_ids.some(id=>typeof id!=='string'||!uuid.test(id)))throw new Error('Проверьте настройки уведомлений')
 return {...value,actor_ids:[...new Set(value.actor_ids)]}
}
const fail=(res,error)=>{console.warn('Notifications:',error.message);res.status(503).json({error:'Не удалось загрузить или сохранить уведомления. Попробуйте ещё раз.'})}
router.use('/profile-inbox',requireUser,(req,res,next)=>{if(req.get('X-Profile-Id')&&req.get('X-Profile-Id')!==req.user.id)return res.status(409).json({error:'Аккаунт изменился. Обновите уведомления.'});next()})
router.get('/profile-inbox/settings',async(req,res)=>{
 try{
  const db=getAdmin(),[settings,follows]=await Promise.all([
   db.rpc('read_notification_preferences',{p_user:req.user.id}).abortSignal(AbortSignal.timeout(8000)),
   db.from('profile_follows').select('profile:following_id(id,first_name,last_name,avatar_img)').eq('follower_id',req.user.id).order('created_at').limit(1000).abortSignal(AbortSignal.timeout(8000))
  ])
  if(settings.error||follows.error)throw settings.error||follows.error
  res.set('Cache-Control','no-store').json({settings:settings.data,following:follows.data.map(f=>Array.isArray(f.profile)?f.profile[0]:f.profile).filter(Boolean)})
 }catch(error){fail(res,error)}
})
router.put('/profile-inbox/settings',async(req,res)=>{
 let settings
 try{settings=validatePreferences(req.body)}catch(error){return res.status(400).json({error:error.message})}
 try{
  const {data,error}=await getAdmin().rpc('save_notification_preferences',{p_user:req.user.id,p_settings:settings}).abortSignal(AbortSignal.timeout(8000))
  if(error)throw error
  res.set('Cache-Control','no-store').json({settings:data})
 }catch(error){fail(res,error)}
})
router.get('/profile-inbox',async(req,res)=>{
 const limit=Number(req.query.limit||50)
 if(!Number.isInteger(limit)||limit<1||limit>500)return res.status(400).json({error:'Некорректный размер списка'})
 try{
  const {data,error}=await getAdmin().rpc('read_profile_inbox',{p_user:req.user.id,p_limit:limit}).abortSignal(AbortSignal.timeout(8000))
  if(error)throw error
  res.set('Cache-Control','no-store').json(data)
 }catch(error){fail(res,error)}
})
router.post('/profile-inbox/read',async(req,res)=>mutate(req,res,false))
router.post('/profile-inbox/clear',async(req,res)=>mutate(req,res,true))
async function mutate(req,res,clear){
 const {ids,all,before}=req.body||{}
 if(all!==true&&(!Array.isArray(ids)||ids.length>500||ids.some(id=>typeof id!=='string'||!uuid.test(id))))return res.status(400).json({error:'Некорректные уведомления'})
 if(all===true&&(typeof before!=='string'||!Number.isFinite(Date.parse(before))||Date.parse(before)>Date.now()+10000))return res.status(400).json({error:'Обновите список уведомлений'})
 if(all!==true&&!ids.length)return res.json({ok:true})
 try{
  const now=new Date().toISOString()
  let query=getAdmin().from('profile_notifications').update(clear?{dismissed_at:now}:{read_at:now}).eq('recipient_id',req.user.id).is('dismissed_at',null)
  if(all===true)query=query.lte('created_at',before)
  else query=query.in('id',ids)
  if(!clear)query=query.is('read_at',null)
  const {error}=await query.abortSignal(AbortSignal.timeout(8000));if(error)throw error
  res.json({ok:true})
 }catch(error){fail(res,error)}
}
module.exports=router
module.exports.validatePreferences=validatePreferences
