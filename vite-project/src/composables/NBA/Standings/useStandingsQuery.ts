import { type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { fetchNbaStatsRows } from '../../../utils/nbaStatsRows'

export function useStandingsQuery(season: Ref<string>) {
    return useQuery({
        queryKey: ['standings', season],
        queryFn: ({ queryKey: [, selected], signal }) => fetchNbaStatsRows<Record<string, any>>(`/api/standings/${selected}`, signal),
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        refetchInterval: 60_000,
        retry: 1
    })
}
