const router=require('express').Router()
const service=require('../services/staffProfiles')
const teams=new Set(Object.values(require('../constants/teamMap')).map(t=>t.abbr))
const validPerson=(role,id)=>['coach','executive'].includes(role) && /^[a-z0-9]{3,24}$/.test(id)
const validSeason=season=>/^(19|20)\d{2}-\d{2}$/.test(season) && String(Number(season.slice(0,4))+1).slice(-2)===season.slice(-2) && Number(season.slice(0,4))>=1946 && Number(season.slice(0,4))<=new Date().getUTCFullYear()
router.get('/staff/:role/:id',async(req,res)=>{
    const {role,id}=req.params
    if (!validPerson(role,id)) return res.status(400).json({error:'Некорректный профиль'})
    try {res.json(await service.staffProfile(role,id))}catch(error){console.warn('Staff profile:',error.message);res.status(503).json({error:'Профиль временно недоступен. Попробуйте ещё раз.'})}
})
router.get('/staff/:role/:id/season/:season',async(req,res)=>{
    const {role,id,season}=req.params
    if (!validPerson(role,id) || !validSeason(season)) return res.status(400).json({error:'Некорректный профиль или сезон'})
    try {res.json(await service.staffSeason(role,id,season))}catch(error){res.status(503).json({error:'Результаты сезона временно недоступны'})}
})
router.get('/team-staff/:abbr/:season',async(req,res)=>{
    const {abbr,season}=req.params
    if (!teams.has(abbr) || !validSeason(season)) return res.status(400).json({error:'Некорректная команда или сезон'})
    try {res.json(await service.teamSeason(abbr,season))}catch(error){res.status(503).json({error:'Не удалось загрузить тренерский штаб этого сезона'})}
})
module.exports=router
