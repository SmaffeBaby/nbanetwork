const router=require('express').Router()
const {seasonAwards,categories}=require('../services/seasonAwards')
router.get('/season-awards/:season/:category',async(req,res)=>{
    const {season,category}=req.params, match=/^(20\d{2})-(\d{2})$/.exec(season)
    const calendar=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'Europe/Moscow',year:'numeric',month:'numeric'}).formatToParts(new Date()).map(part=>[part.type,part.value]))
    const latest=Number(calendar.year)-(Number(calendar.month)<9?1:0)
    if (!match || Number(match[1])<2000 || Number(match[1])>latest || String(Number(match[1])+1).slice(-2)!==match[2] || !Object.hasOwn(categories,category)) return res.status(400).json({error:'Некорректный сезон или раздел наград'})
    try { res.json(await seasonAwards(season,category)) }
    catch (error) { res.status(503).json({error:'Не удалось загрузить награды. Попробуйте ещё раз.'}) }
})
module.exports=router
