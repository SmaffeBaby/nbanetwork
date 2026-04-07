import { ref, computed } from 'vue'
import axios from 'axios'

export interface GameLog {
    GAME_DATE: string
    MATCHUP: string
    WL: string
    MIN: number
    FGM: number
    FGA: number
    FG_PCT: number
    FG3M: number
    FG3A: number
    FG3_PCT: number
    FTM: number
    FTA: number
    FT_PCT: number
    OREB: number
    DREB: number
    REB: number
    AST: number
    STL: number
    BLK: number
    TOV: number
    PF: number
    PTS: number
    PLUS_MINUS: number
}

export function usePlayerGameLog(playerId: number, season: string) {
    const games = ref<GameLog[]>([])
    const loading = ref(false)

    const fetchGames = async () => {
        loading.value = true
        try {
            const res = await axios.get(`/api/player-gamelog/${playerId}/${season}`)
            const resultSets = res.data?.resultSets
            if (!resultSets || !resultSets[0]) {
                games.value = []
                loading.value = false
                return
            }

            const headers = resultSets[0].headers
            const rows = resultSets[0].rowSet

            // Преобразуем массив массивов в массив объектов
            games.value = rows.map((row: any[]) => {
                const obj: any = {}
                headers.forEach((h: string, i: number) => {
                    obj[h] = row[i]
                })
                return obj as GameLog
            })
        } catch (err) {
            console.error('Failed to fetch game log', err)
            games.value = []
        } finally {
            loading.value = false
        }
    }

    // Данные для Chart.js
    const chartData = computed(() => ({
        labels: games.value.map(g => g.GAME_DATE),
        datasets: [
            {
                label: 'PTS',
                data: games.value.map(g => g.PTS),
                borderColor: 'rgb(34,197,94)',
                backgroundColor: 'rgba(34,197,94,0.2)',
                tension: 0.3
            },
            {
                label: 'REB',
                data: games.value.map(g => g.REB),
                borderColor: 'rgb(59,130,246)',
                backgroundColor: 'rgba(59,130,246,0.2)',
                tension: 0.3
            },
            {
                label: 'AST',
                data: games.value.map(g => g.AST),
                borderColor: 'rgb(234,179,8)',
                backgroundColor: 'rgba(234,179,8,0.2)',
                tension: 0.3
            }
        ]
    }))

    return { games, loading, fetchGames, chartData }
}