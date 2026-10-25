const router=require('express').Router()
const {getAdmin}=require('../lib/supabase')
const {requireUser}=require('../middleware/auth')
const fields='id,title,body,links,created_at'
async function requireAdmin(req,res,next){
 try{
  const {data,error}=await getAdmin().from('profiles').select('admin').eq('id',req.user.id).single().abortSignal(AbortSignal.timeout(5000))
  if(error) throw error
  if(!data?.admin) return res.status(403).json({error:'Редактировать патчи может только администратор'})
  next()
 }catch{res.status(503).json({error:'Не удалось проверить права администратора'})}
}
function payload(body){
 const title=String(body?.title||'').trim(),text=String(body?.body||'').trim()
 if(!title||!text||title.length>300||text.length>200000)throw new Error('Добавьте заголовок до 300 символов и текст до 200 000 символов.')
 if(!Array.isArray(body.links)||body.links.length>50)throw new Error('Допускается не более 50 ссылок.')
 const links=body.links.map(link=>{
  const label=String(link.label||'').trim(),url=String(link.url||'').trim()
  let parsed;try{parsed=new URL(url)}catch{throw new Error('Проверьте ссылки: нужен адрес http:// или https://.')}
  if(!['http:','https:'].includes(parsed.protocol)||url.length>2048||label.length>300)throw new Error('Проверьте адрес и название ссылки.')
  return {label,url}
 })
 return {title,body:text,links,published:true}
}
router.get('/patch-notes',async(req,res)=>{
 try{
  const {data,error}=await getAdmin().from('patch_notes').select(fields).eq('published',true).order('created_at',{ascending:false}).abortSignal(AbortSignal.timeout(5000))
  if(error)throw error
  res.set('Cache-Control','no-cache');res.json({notes:data||[]})
 }catch{res.status(503).json({error:'Не удалось загрузить патчи. Попробуйте ещё раз.'})}
})
router.put('/patch-notes/:id',requireUser,requireAdmin,async(req,res)=>{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id))return res.status(400).json({error:'Некорректный ID патча'})
 let values;try{values=payload(req.body)}catch(error){return res.status(400).json({error:error.message})}
 try{
  const admin=getAdmin()
  const {data:existing,error:readError}=await admin.from('patch_notes').select('author_id').eq('id',req.params.id).maybeSingle().abortSignal(AbortSignal.timeout(5000))
  if(readError)throw readError
  const {data,error}=await admin.from('patch_notes').upsert({id:req.params.id,...values,author_id:existing?.author_id||req.user.id},{onConflict:'id'}).select(fields).single().abortSignal(AbortSignal.timeout(5000))
  if(error)throw error
  res.json({note:data})
 }catch{res.status(503).json({error:'Не удалось подтвердить сохранение. Текст сохранён в черновике — попробуйте ещё раз.'})}
})
router.delete('/patch-notes/:id',requireUser,requireAdmin,async(req,res)=>{
 try{
  const {error}=await getAdmin().from('patch_notes').delete().eq('id',req.params.id).abortSignal(AbortSignal.timeout(5000))
  if(error)throw error
  res.json({deleted:true})
 }catch{res.status(503).json({error:'Не удалось удалить патч. Попробуйте ещё раз.'})}
})
module.exports=router
module.exports.payload=payload
