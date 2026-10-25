import { ref, computed, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { fetchNbaStatsRows } from '../../../utils/nbaStatsRows'

export interface PlayerStats {
    PLAYER_ID: number
    PLAYER_NAME: string
    TEAM_ABBREVIATION: string
    PTS: number
    REB: number
    AST: number
    STL: number
    BLK: number
    TOV: number
    MIN: number
}

export type StatKey = 'PTS' | 'REB' | 'AST' | 'STL' | 'BLK' | 'TOV' | 'MIN'

export function usePlayerStats(season: Ref<string>) {
    const route = useRoute()
    const mode = computed(() => {
        const segment = route.path.split('/')[2]
        return segment === 'playoffs' || segment === 'all' ? segment : 'regular'
    })
    const query = useQuery({
        queryKey: ['player-stats', season, mode],
        enabled: computed(() => Boolean(season.value)),
        queryFn: ({ queryKey: [, selected, type], signal }) => {
            const url = type === 'regular' ? `/api/player-stats/${selected}` : `/api/player-stats/${type}/${selected}`
            return fetchNbaStatsRows<PlayerStats>(url, signal)
        },
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        retry: 1
    })
    const players = computed(() => query.data.value ?? [])
    const loading = computed(() => query.isPending.value)
    const error = computed(() => query.error.value?.message ?? '')

    const search = ref('')
    const team = ref('')
    const sortBy = ref<StatKey>('PTS')

    const fetchPlayerStats = () => query.refetch()

    const teams = computed(() =>
        [...new Set(players.value.map(p => p.TEAM_ABBREVIATION))]
    )

    const filteredPlayers = computed(() =>
        players.value
            .filter(p =>
                p.PLAYER_NAME.toLowerCase().includes(search.value.toLowerCase())
            )
            .filter(p =>
                team.value ? p.TEAM_ABBREVIATION === team.value : true
            )
            .sort((a, b) => b[sortBy.value] - a[sortBy.value])
    )

    return {
        players,
        loading,
        error,
        fetchPlayerStats,
        search,
        team,
        sortBy,
        teams,
        filteredPlayers
    }
}