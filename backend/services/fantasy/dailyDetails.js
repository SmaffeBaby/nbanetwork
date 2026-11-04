const {getAdmin}=require('../../lib/supabase')
const {scoreBreakdown}=require('./rules')
module.exports=async function dailyDetails(id,period,profile,mode) {
    const db=getAdmin(), empty={profile:Boolean(profile),points:0,basePoints:0,bonusPoints:0,bonusRate:0,bonusLevel:1,games:[]}
    let bonus={bonusPoints:0,bonusRate:0,bonusLevel:1}
    let query=db.from('fantasy_daily_scores').select('*').eq('day',period.id).eq('player_id',id).order('starts_at')
    if(profile) {
        const [result, entry] = await Promise.all([
            db.from('fantasy_daily_player_results').select('bonus_points,bonus_rate,bonus_level')
                .eq('user_id',profile).eq('day',period.id).eq('mode',mode).eq('player_id',id).maybeSingle().abortSignal(AbortSignal.timeout(8000)),
            db.from('fantasy_daily_entries').select('confirmed_at')
                .eq('user_id',profile).eq('day',period.id).eq('mode',mode).maybeSingle().abortSignal(AbortSignal.timeout(8000))
        ])
        if (result.error || entry.error) throw result.error || entry.error
        if (!result.data || !entry.data) return empty
        query = query.gte('starts_at',entry.data.confirmed_at)
        bonus = {bonusPoints:Number(result.data.bonus_points),bonusRate:Number(result.data.bonus_rate),bonusLevel:result.data.bonus_level}
    }
    const {data,error}=await query.abortSignal(AbortSignal.timeout(8000))
    if(error) throw error
    const basePoints=Math.round(data.reduce((sum,g)=>sum+Number(g.points),0)*10)/10
    return {...empty,...bonus,basePoints,points:Math.round((basePoints+bonus.bonusPoints)*10)/10,
        games:data.map(g=>({id:g.game_id.replace('espn:',''),start:g.starts_at,points:Number(g.points),matchup:`${g.stats.awayAbbr} — ${g.stats.homeAbbr}`,breakdown:scoreBreakdown(g.stats,g.stats.won,g.stats.scoringPosition)}))}
}
