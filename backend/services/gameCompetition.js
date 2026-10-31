// Classify by provider metadata, never by the date alone: Cup nights also vary by year.
function gameCompetition(event = {}, fallbackType) {
    const c = event.competitions?.[0] || event.header?.competitions?.[0] || {}
    const type = Number(event.season?.type ?? event.header?.season?.type ?? event.GAME_SEASON_TYPE ?? fallbackType)
    const notes = [...(c.notes || []), ...(event.notes || []), ...(event.GAME_NOTES || []), event.header?.gameNote || event.gameNote || '']
        .map(n => typeof n === 'string' ? n : n.headline || n.text || '').join(' ')
    const year = Number(event.season?.year ?? event.header?.season?.year ?? event.GAME_SEASON_YEAR)
    if (/NBA Cup|In.Season Tournament/i.test(notes)) {
        const stage = /quarterfinal/i.test(notes) ? 'quarterfinal' : /semifinal/i.test(notes) ? 'semifinal' : /championship|\bfinals?\b/i.test(notes) ? 'final' : /group/i.test(notes) ? 'group' : 'unknown'
        return { kind:'cup', label:'Emirates NBA Cup', stage, stageLabel:({group:'Групповая стадия',quarterfinal:'Четвертьфинал',semifinal:'Полуфинал',final:'Финал'})[stage] || '', regularSeason:stage==='unknown'?null:stage!=='final', year:Number.isFinite(year)?year-1:null }
    }
    if (type===5 || /play.in/i.test(notes)) return {kind:'play-in',label:'Плей-ин',regularSeason:false}
    if (type===1) return {kind:'preseason',label:'Предсезонные игры',regularSeason:false}
    if (type===3) return {kind:'playoffs',label:'Плей-офф',regularSeason:false}
    if (type===2) return {kind:'regular',label:'Регулярный сезон',regularSeason:true}
    return null
}
module.exports = { gameCompetition }
