const axios = require('axios')
const fetchWithCache = require('../../utils/fetchWithCache')
const TEAM_MAP = require('../../constants/teamMap')
const aliases = { NY: 'NYK', GS: 'GSW', SA: 'SAS', NO: 'NOP', UTAH: 'UTA', WSH: 'WAS', PHO: 'PHX', BRK: 'BKN', CHO: 'CHA' }
const abbr = value => aliases[String(value || '').toUpperCase()] || String(value || '').toUpperCase()
function normalizeId(value) {
    const id = String(value || '').trim()
    if (/^(?:espn:)?\d{9}$/.test(id)) return `espn:${id.replace(/^espn:/, '')}`
    if (/^(?:nba:)?\d{8,10}$/.test(id)) return id.replace(/^nba:/, '').padStart(10, '0')
    throw new Error('Некорректный идентификатор матча')
}
function dateKey(value) {
    const text = String(value || '')
    const local = text.match(/^(\d{2})\.(\d{2})\.(\d{4})/)
    if (local) return `${local[3]}-${local[2]}-${local[1]}`
    const named = text.match(/^([a-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/i)
    if (named) {
        const month = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].indexOf(named[1].toUpperCase()) + 1
        if (month) return `${named[3]}-${String(month).padStart(2,'0')}-${named[2].padStart(2,'0')}`
    }
    if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return ''
    if (!/T/.test(text)) return text.slice(0, 10)
    const date = new Date(text)
    if (!Number.isFinite(date.getTime())) return ''
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(x => [x.type,x.value]))
    return `${parts.year}-${parts.month}-${parts.day}`
}
function matchKey(game) {
    const date = dateKey(game?.dateUTC || game?.date)
    const home = abbr(game?.homeAbbr), away = abbr(game?.awayAbbr)
    return date && home && away && home !== away ? `${date}:${away}:${home}` : ''
}
function sameGame(a,b) {
    if (!a || !b) return false
    try { if (normalizeId(a.id) === normalizeId(b.id)) return true } catch { /* Legacy metadata can still identify the game. */ }
    return Boolean(matchKey(a) && matchKey(a) === matchKey(b))
}
function matchEvent(events, metadata) {
    const matches = events.filter(event => {
        const c = event.competitions?.[0]?.competitors || []
        const home = c.find(x=>x.homeAway==='home'), away = c.find(x=>x.homeAway==='away')
        return abbr(home?.team?.abbreviation) === abbr(metadata.homeAbbr) && abbr(away?.team?.abbreviation) === abbr(metadata.awayAbbr)
            && (metadata.nbaDate ? new Intl.DateTimeFormat('en-CA', {timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(event.date)) === dateKey(metadata.date) : dateKey(event.date) === dateKey(metadata.date))
    })
    const unique = [...new Map(matches.map(event => [event.id,event])).values()]
    if (unique.length !== 1) throw new Error('Не удалось однозначно найти матч в ESPN')
    return `espn:${unique[0].id}`
}
async function nbaMetadata(id) {
    // Previously saved calendars can identify old bookmarks without relying on NBA availability.
    try {
        const {data,error} = await require('../../lib/supabase').getAdmin().from('nba_games_by_date_cache')
            .select('payload').contains('payload', [{GAME_ID:id}]).limit(1).abortSignal(AbortSignal.timeout(1500))
        if (!error) {
            const game = data?.[0]?.payload?.find(game => String(game.GAME_ID) === id)
            if (game) return {date:game.GAME_TIME_UTC || game.GAME_DATE_MSK, homeAbbr:game.HOME_TEAM_ABBREVIATION || TEAM_MAP[game.HOME_TEAM_ID]?.abbr,
                awayAbbr:game.VISITOR_TEAM_ABBREVIATION || TEAM_MAP[game.VISITOR_TEAM_ID]?.abbr}
        }
    } catch { /* Calendar cache is optional. */ }
    const { data } = await axios.get(`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${id}.json`, { timeout: 6000 })
    const game = data.game
    if (String(game?.gameId) !== id) throw new Error('NBA metadata unavailable')
    return { date: game.gameTimeUTC, homeAbbr: game.homeTeam?.teamTricode || TEAM_MAP[game.homeTeam?.teamId]?.abbr,
        awayAbbr: game.awayTeam?.teamTricode || TEAM_MAP[game.awayTeam?.teamId]?.abbr }
}
async function resolveGameId(value, hint = {}) {
    const id = normalizeId(value)
    if (id.startsWith('espn:')) return id
    // Hints are part of the cache key: a crafted link cannot poison another match's mapping.
    return fetchWithCache({ key: `espn-identity-v1:${id}:${matchKey(hint)}:${Boolean(hint.nbaDate)}`, ttl: 30 * 86400000,
        staleWhileRevalidate: false, fetcher: async () => {
            const metadata = matchKey(hint) ? hint : await nbaMetadata(id)
            if (!matchKey(metadata)) throw new Error('Для старого NBA ID нужны дата и обе команды матча')
            const date = new Date(`${dateKey(metadata.date)}T00:00:00Z`)
            const days = (metadata.nbaDate ? [0,1] : [-1,0]).map(offset => new Date(date.getTime()+offset*86400000).toISOString().slice(0,10).replaceAll('-',''))
            const responses = await Promise.all(days.map(dates => axios.get('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard', { params: {dates, limit:100}, timeout:8000 })))
            return matchEvent(responses.flatMap(r=>r.data.events || []), metadata)
        } })
}
function snapshotFromRecap(recap) {
    const m = recap.meta
    return { id: normalizeId(recap.gameId), source: 'espn', date: recap.dateUTC,
        homeName:m.homeTeam, homeAbbr:abbr(m.homeAbbr), homeScore:m.homeScore ?? null,
        awayName:m.awayTeam, awayAbbr:abbr(m.awayAbbr), awayScore:m.awayScore ?? null }
}
module.exports = { normalizeId, dateKey, matchKey, sameGame, matchEvent, resolveGameId, snapshotFromRecap }
