import type { Game } from '../../../api/api'

export const isLiveGame = (game: Game) => game.period > 0 && !/final|cancel|postpon|ppd/i.test(game.status)

export function selectActiveGames(games: Game[]) {
  const unique = new Map(games.filter(game => !/final|cancel|postpon|ppd/i.test(game.status)).map(game => [String(game.id), game]))
  return [...unique.values()].sort((a,b) => Date.parse(a.datetime)-Date.parse(b.datetime) || String(a.id).localeCompare(String(b.id)))
}
export const selectLiveGames = (games: Game[]) => selectActiveGames(games).filter(isLiveGame)
export const selectUpcomingGames = (games: Game[]) => selectActiveGames(games).filter(game => !isLiveGame(game)).slice(0,6)
