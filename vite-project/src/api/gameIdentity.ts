export const canonicalGameId = (value: unknown) => {
    const id = String(value ?? '').trim()
    if (/^(?:espn:)?\d{9}$/.test(id)) return `espn:${id.replace(/^espn:/, '')}`
    if (/^(?:nba:)?\d{8,10}$/.test(id)) return id.replace(/^nba:/, '').padStart(10, '0')
    return id
}
const aliases: Record<string,string> = { NY:'NYK',GS:'GSW',SA:'SAS',NO:'NOP',UTAH:'UTA',WSH:'WAS',PHO:'PHX',BRK:'BKN',CHO:'CHA' }
const team = (value: unknown) => { const key=String(value ?? '').trim().toUpperCase(); return aliases[key] || key }
export function gameDateKey(value: unknown): string {
    const text = String(value ?? '')
    const local=text.match(/^(\d{2})\.(\d{2})\.(\d{4})/)
    if(local) return `${local[3]}-${local[2]}-${local[1]}`
    const named = text.match(/^([a-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/i)
    if (named) {
        const month = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].indexOf(named[1].toUpperCase()) + 1
        if (month) return `${named[3]}-${String(month).padStart(2,'0')}-${named[2].padStart(2,'0')}`
    }
    if(!/^\d{4}-\d{2}-\d{2}/.test(text)) return ''
    if(!text.includes('T')) return text.slice(0,10)
    const date=new Date(text)
    if(!Number.isFinite(date.getTime())) return ''
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(x=>[x.type,x.value]))
    return `${parts.year}-${parts.month}-${parts.day}`
}
export function gameMatchKey(game: any): string {
    const date=gameDateKey(game?.dateUTC || game?.date), home=team(game?.homeAbbr), away=team(game?.awayAbbr)
    return date && home && away && home!==away ? `${date}:${away}:${home}` : ''
}
export function sameGame(a: any,b: any): boolean {
    if(!a || !b) return false
    const id=canonicalGameId(a.id)
    return Boolean(id && id===canonicalGameId(b.id)) || Boolean(gameMatchKey(a) && gameMatchKey(a)===gameMatchKey(b))
}
export function normalizeFavoriteGame(value: any): any | null {
    if(!value || typeof value!=='object' || !value.id) return null
    const score=(n: unknown) => n==null || !Number.isFinite(Number(n)) ? null : Number(n)
    const id=canonicalGameId(value.id)
    return {id, source:id.startsWith('espn:') ? 'espn':'nba', date:value.date ? String(value.date):null,
        homeName:String(value.homeName ?? ''),homeAbbr:team(value.homeAbbr),homeScore:score(value.homeScore),
        awayName:String(value.awayName ?? ''),awayAbbr:team(value.awayAbbr),awayScore:score(value.awayScore)}
}
export function normalizeFavoriteGames(value: unknown): any[] {
    if(!Array.isArray(value)) return []
    const games: any[]=[]
    for(const raw of value) {
        const game=normalizeFavoriteGame(raw)
        if(!game) continue
        const index=games.findIndex(item=>sameGame(item,game))
        if(index<0) games.push(game)
        else if(game.id.startsWith('espn:') || !games[index].id.startsWith('espn:')) games[index]=game
    }
    return games
}
