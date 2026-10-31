const router=require('express').Router(),draws=require('../constants/nbaCupGroups')
router.get('/nba-cup/:year',async(req,res)=>{const year=Number(req.params.year);if(!Number.isInteger(year)||!draws[year])return res.status(400).json({error:'Доступны розыгрыши 2023–2026 годов'});try{res.json(await require('../services/nbaCup').nbaCup(year))}catch(e){console.warn('NBA Cup:',e.message);res.status(503).json({error:'Не удалось загрузить NBA Cup. Попробуйте ещё раз.'})}})
module.exports=router
