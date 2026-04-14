import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../../../stores/auth'

export type SortKey = 'PTS' | 'REB' | 'AST' | 'STL' | 'BLK' | 'TOV' | 'MIN' |'GAME_DATE'

export type GameRaw = {
    GAME_DATE: string
    WL?: string
    MIN?: number
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
    Game_ID: string | number
}

export function usePlayerRecentGames(gamesProp: GameRaw[]) {
    const authStore = useAuthStore()
    const { user } = storeToRefs(authStore)

    const hideScores = computed({
        get: () => !(user.value?.hideScores === false),
        set: (val: boolean) => { if (user.value) void authStore.updateHideScores(!val) }
    })

    const sortField = ref<SortKey>('GAME_DATE')
    const sortAsc = ref(false)

    const sortBy = (key: SortKey) => {
        if (sortField.value === key) sortAsc.value = !sortAsc.value
        else {
            sortField.value = key
            sortAsc.value = false
        }
    }

    const getWinLoss = (g: GameRaw) => {
        if (g.WL) return g.WL
        if (g.HOME_SCORE == null || g.AWAY_SCORE == null) return ''
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

    return { hideScores, sortField, sortAsc, sortBy, getWinLoss, sortedGames }
}