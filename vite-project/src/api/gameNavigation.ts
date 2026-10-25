import type { Router } from 'vue-router'
import { canonicalGameId } from './gameIdentity'
export const publicGameId = (value: string) => canonicalGameId(value).replace(/^espn:/, '')
export const internalGameId = (value: string) => canonicalGameId(value)

export function gameLocation(value: any) {
    const game = typeof value === 'object' && value ? value : { id: value }
    const id = String(game.id ?? game.gameId ?? game.GAME_ID ?? game.Game_ID ?? '')
    const matchup = String(game.MATCHUP || '')
    const sides = matchup.split(/\s+(?:vs\.?|@)\s+/)
    const home = game.homeAbbr || game.HOME_TEAM_ABBR || (sides.length === 2 ? sides[matchup.includes('@') ? 1 : 0] : game.home?.team || '')
    const away = game.awayAbbr || game.AWAY_TEAM_ABBR || (sides.length === 2 ? sides[matchup.includes('@') ? 0 : 1] : game.away?.team || '')
    const date = game.dateUTC || game.date || game.GAME_DATE || ''
    const query: Record<string,string> = {}
    if (!canonicalGameId(id).startsWith('espn:') && date && home && away) {
        Object.assign(query, { date: String(date), home, away })
        if (game.GAME_DATE) query.nbaDate = '1'
    }
    return { name: 'GameDetail', params: { gameId: publicGameId(id) }, query }
}
export function openGame(router: Router, game: any) {
    return router.push(gameLocation(game))
}
export async function resolveGameNavigation(id: string, query: Record<string,any> = {}) {
    const normalized = canonicalGameId(id)
    if (normalized.startsWith('espn:')) return publicGameId(normalized)
    const params = new URLSearchParams()
    for (const key of ['date','home','away','nbaDate']) if (typeof query[key] === 'string') params.set(key, query[key])
    const response = await fetch(`/api/game-identity/${encodeURIComponent(normalized)}?${params}`, { signal: AbortSignal.timeout(25000) })
    const data = await response.json()
    if (!response.ok || data.source !== 'espn' || !/^\d{9}$/.test(data.publicId)) throw new Error(data.error || 'Матч не найден в ESPN')
    return data.publicId as string
}
