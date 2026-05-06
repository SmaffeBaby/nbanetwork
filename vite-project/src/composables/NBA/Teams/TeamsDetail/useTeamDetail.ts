import { ref, type Ref } from 'vue'
import axios from 'axios'
import type { PlayerStats } from '../../player_stats/usePlayerStats'

export function useTeamDetail(
    teamAbbr: string,
    season: Ref<string>,
    seasonType: Ref<'regular' | 'playoffs'>
) {
    const players = ref<PlayerStats[]>([])
    const loading = ref(false)
    const search = ref('')

    const fetchPlayers = async () => {
        loading.value = true

        const url = seasonType.value === 'playoffs'
            ? `/api/player-stats/playoffs/${season.value}`
            : `/api/player-stats/${season.value}`

        const res = await axios.get(url)

        const rows = res.data.resultSets[0].rowSet
        const headers = res.data.resultSets[0].headers

        const allPlayers = rows.map((row: any[]) => {
            const obj: any = {}
            headers.forEach((h: string, i: number) => {
                obj[h] = row[i]
            })
            return obj as PlayerStats
        })

        players.value = allPlayers.filter(
            (p: PlayerStats) => p.TEAM_ABBREVIATION === teamAbbr
        )

        loading.value = false
    }

    return {
        players,
        loading,
        search,
        fetchPlayers
    }
}