import { ref, computed } from 'vue'
import axios from 'axios'

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

export function usePlayerStats() {
    const players = ref<PlayerStats[]>([])
    const loading = ref(false)

    const search = ref('')
    const team = ref('')
    const sortBy = ref<StatKey>('PTS')

    const fetchPlayerStats = async () => {
        loading.value = true

        const res = await axios.get(`/api/player-stats/2025-26`)

        const rows = res.data.resultSets[0].rowSet
        const headers = res.data.resultSets[0].headers

        players.value = rows.map((row: any[]) => {
            const obj: any = {}
            headers.forEach((h: string, i: number) => {
                obj[h] = row[i]
            })
            return obj as PlayerStats
        })

        loading.value = false
    }

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
        fetchPlayerStats,
        search,
        team,
        sortBy,
        teams,
        filteredPlayers
    }
}