import { ref, computed, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getCurrentNbaSeason, generateNbaSeasons } from '../../utils/generateNbaSeasons'

export function useCurrentSeason(startYear?: number) {
    const season = ref(getCurrentNbaSeason())
    const query = useQuery({
        queryKey: ['nba-current-season'],
        queryFn: async ({ signal }): Promise<string> => {
            const response = await fetch('/api/current-season', {
                signal: AbortSignal.any([signal, AbortSignal.timeout(10000)])
            })
            if (!response.ok) throw new Error('Не удалось определить сезон')
            const data = await response.json()
            if (!/^\d{4}-\d{2}$/.test(data.season) ||
                String(Number(data.season.slice(0, 4)) + 1).slice(-2) !== data.season.slice(-2)) {
                throw new Error('Сервер вернул некорректный сезон')
            }
            return data.season
        },
        staleTime: 60 * 60_000,
        gcTime: 24 * 60 * 60_000,
        refetchInterval: 60 * 60_000,
        retry: 1
    })
    // A delayed API/cache must not hide a season already reached by the calendar.
    const currentSeason = computed(() => [getCurrentNbaSeason(), query.data.value ?? ''].sort().at(-1)!)
    const seasons = computed(() => generateNbaSeasons(startYear ?? Number(currentSeason.value.slice(0, 4)) - 3, currentSeason.value))
    watch(currentSeason, (next, previous) => {
        if (season.value === previous) season.value = next
    })
    return { currentSeason, season, seasons, fetchCurrentSeason: () => query.refetch() }
}
