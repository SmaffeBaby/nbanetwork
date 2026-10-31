const router=require('express').Router()
router.get('/team-chart',async(req,res)=>{
 const year=Number(req.query.season),type=Number(req.query.type||2)
 if(!Number.isInteger(year)||year<2016||year>new Date().getUTCFullYear()+1||![2,3].includes(type))return res.status(400).json({error:'Некорректный сезон или этап'})
 try{const data=await require('../services/teamChart').teamChart(year,type);res.json(data)}catch(error){console.warn('Team chart:',error.message);res.status(503).json({error:'Командная статистика временно недоступна. Попробуйте ещё раз.'})}
})
module.exports=router
