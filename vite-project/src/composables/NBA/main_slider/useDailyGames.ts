import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { Game } from '../../../api/api.ts'
import { formatGameTime } from '../utils'

export const isLiveGame = (game: Game) => game.period > 0 && !/final|cancel|postpon|ppd/i.test(game.status)
export const selectUpcomingGames = (games: Game[]) => {
    const unique = new Map(games.filter(game => !/final|cancel|postpon|ppd/i.test(game.status)).map(game => [String(game.id), game]))
    return [...unique.values()].sort((a, b) => Number(isLiveGame(b)) - Number(isLiveGame(a)) || Date.parse(a.datetime) - Date.parse(b.datetime)).slice(0, 6)
}

export function useDailyGames() {
    const query = useQuery({
        queryKey: ['upcoming-games'],
        queryFn: async ({ signal }): Promise<Game[]> => {
            const response = await fetch('/api/upcoming-games', {
                signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]), cache: 'no-cache'
            })
            if (!response.ok) throw new Error('Не удалось загрузить ближайшие игры')
            const data = await response.json()
            if (!Array.isArray(data)) throw new Error('Некорректный список игр')
            return selectUpcomingGames(data)
        },
        staleTime: 15_000,
        gcTime: 30 * 60_000,
        refetchInterval: 30_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 1
    })
    return {
        gamesList: computed(() => query.data.value ?? []),
        loading: computed(() => query.isPending.value),
        error: computed(() => query.error.value?.message ?? null),
        retry: () => query.refetch(),
        formatGameTime
    }
}
export type { Game } from '../../../api/api.ts'
