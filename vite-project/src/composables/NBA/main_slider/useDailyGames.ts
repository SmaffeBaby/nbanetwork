import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { Game } from '../../../api/api.ts'
import { formatGameTime } from '../utils'

import { selectActiveGames, selectLiveGames, selectUpcomingGames } from './gameSections'
export { isLiveGame, selectUpcomingGames } from './gameSections'

export function useDailyGames() {
    const query = useQuery({
        queryKey: ['home-active-games'],
        queryFn: async ({ signal }): Promise<Game[]> => {
            const response = await fetch('/api/upcoming-games', {
                signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]), cache: 'no-cache'
            })
            if (!response.ok) throw new Error('Не удалось загрузить ближайшие игры')
            const data = await response.json()
            if (!Array.isArray(data)) throw new Error('Некорректный список игр')
            return selectActiveGames(data)
        },
        staleTime: 15_000,
        gcTime: 30 * 60_000,
        refetchInterval: 30_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 1
    })
    return {
        gamesList: computed(() => selectUpcomingGames(query.data.value ?? [])),
        liveGames: computed(() => selectLiveGames(query.data.value ?? [])),
        loading: computed(() => query.isPending.value),
        error: computed(() => query.error.value?.message ?? null),
        retry: () => query.refetch(),
        formatGameTime
    }
}
export type { Game } from '../../../api/api.ts'
