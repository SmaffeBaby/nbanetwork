const {getAdmin}=require('../../lib/supabase')
const {scoreBreakdown}=require('./rules')
module.exports=async function dailyDetails(id,period,profile,mode) {
    const db=getAdmin(), empty={profile:Boolean(profile),points:0,basePoints:0,bonusPoints:0,bonusRate:0,bonusLevel:1,games:[]}
    let bonus={bonusPoints:0,bonusRate:0,bonusLevel:1}
    let query=db.from('fantasy_daily_scores').select('*').eq('day',period.id).eq('player_id',id).order('starts_at')
    if(profile) {
        const {data,error}=await db.from('fantasy_daily_player_results').select('*').eq('user_id',profile).eq('day',period.id).eq('mode',mode).eq('player_id',id).maybeSingle()
        if(error) throw error
        if(!data) return empty
        bonus={bonusPoints:Number(data.bonus_points),bonusRate:Number(data.bonus_rate),bonusLevel:data.bonus_level}
    }
    const {data,error}=await query.abortSignal(AbortSignal.timeout(8000))
    if(error) throw error
    const basePoints=Math.round(data.reduce((sum,g)=>sum+Number(g.points),0)*10)/10
    return {...empty,...bonus,basePoints,points:Math.round((basePoints+bonus.bonusPoints)*10)/10,
        games:data.map(g=>({id:g.game_id.replace('espn:',''),start:g.starts_at,points:Number(g.points),matchup:`${g.stats.awayAbbr} — ${g.stats.homeAbbr}`,breakdown:scoreBreakdown(g.stats,g.stats.won,g.stats.scoringPosition)}))}
}
