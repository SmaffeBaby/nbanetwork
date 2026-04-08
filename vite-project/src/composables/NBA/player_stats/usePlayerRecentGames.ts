import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../../../stores/auth'

export type SortKey = 'PTS' | 'REB' | 'AST' | 'STL' | 'BLK' | 'TOV' | 'GAME_DATE'

export type GameRaw = {
    GAME_DATE: string
    MATCHUP: string
    WL?: string
    MIN?: number
    FGM?: number
    FGA?: number
    FG_PCT?: number
    PTS?: number
    REB?: number
    AST?: number
    STL?: number
    BLK?: number
    TOV?: number
    HOME_SCORE?: number
    AWAY_SCORE?: number
    HOME_TEAM_ABBR?: string | null
    AWAY_TEAM_ABBR?: string | null
}

export function usePlayerRecentGames(gamesProp: GameRaw[]) {
    // Auth
    const authStore = useAuthStore()
    const { user } = storeToRefs(authStore)

    const hideScores = computed({
        get: () => !(user.value?.hideScores === false),
        set: (val: boolean) => {
            if (user.value) void authStore.updateHideScores(!val)
        }
    })

    // Сортировка
    const sortField = ref<SortKey>('GAME_DATE')
    const sortAsc = ref(false)

    const sortableFields: { key: SortKey; label: string }[] = [
        { key: 'PTS', label: 'PTS' },
        { key: 'AST', label: 'AST' },
        { key: 'REB', label: 'REB' },
        { key: 'STL', label: 'STL' },
        { key: 'BLK', label: 'BLK' },
        { key: 'TOV', label: 'TOV' },
        { key: 'GAME_DATE', label: 'Date' }
    ]

    const sortBy = (key: SortKey) => {
        if (sortField.value === key) sortAsc.value = !sortAsc.value
        else {
            sortField.value = key
            sortAsc.value = false
        }
    }

    const getHomeTeamAbbr = (g: GameRaw) => g.HOME_TEAM_ABBR || undefined
    const getAwayTeamAbbr = (g: GameRaw) => g.AWAY_TEAM_ABBR || undefined

    const getWinLoss = (g: GameRaw) => {
        if (g.WL) return g.WL
        if (g.HOME_SCORE === undefined || g.AWAY_SCORE === undefined) return ''
        return g.HOME_SCORE > g.AWAY_SCORE ? 'W' : 'L'
    }

    const sortedGames = computed(() => {
        return [...gamesProp]
            .filter(g => g.GAME_DATE)
            .sort((a, b) => {
                let aVal: any = a[sortField.value]
                let bVal: any = b[sortField.value]

                if (sortField.value === 'GAME_DATE') {
                    aVal = new Date(aVal).getTime()
                    bVal = new Date(bVal).getTime()
                }

                if (aVal === undefined) return 1
                if (bVal === undefined) return -1

                return sortAsc.value ? aVal - bVal : bVal - aVal
            })
    })

    return {
        hideScores,
        sortField,
        sortAsc,
        sortableFields,
        sortBy,
        getHomeTeamAbbr,
        getAwayTeamAbbr,
        getWinLoss,
        sortedGames
    }
}