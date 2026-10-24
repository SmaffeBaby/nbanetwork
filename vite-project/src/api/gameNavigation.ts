import type { Router } from 'vue-router'

export const publicGameId = (value: string) => value.replace(/^espn:/, '')
export const internalGameId = (value: string) => /^\d{9}$/.test(value) ? `espn:${value}` : value

export function openGame(router: Router, gameId: string) {
    router.push({ name: 'GameDetail', params: { gameId: publicGameId(gameId) } })
}
