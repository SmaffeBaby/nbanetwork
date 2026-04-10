import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../../../../stores/auth'

export function useTeamGameTable(teamId: number, season: string) {
    const auth = useAuthStore()

    const games = ref<any[]>([])
    const filter = ref<'ALL' | 'W' | 'L'>('ALL')

    const hideScoresModel = computed({
        get: () => auth.user?.hideScores ?? true,
        set: async (val: boolean) => {
            if (!auth.user) return
            await auth.updateHideScores(val)
        }
    })

    const loadGames = async () => {
        const res = await axios.get(
            `http://localhost:3000/api/team-games/${teamId}/${season}`
        )

        const resultSet = res.data.resultSets?.[0]
        if (!resultSet) return

        const headers = resultSet.headers

        games.value = resultSet.rowSet.map((row: any[]) => {
            const obj: any = {}
            headers.forEach((h: string, i: number) => {
                obj[h] = row[i]
            })
            return obj
        })
    }

    const filteredGames = computed(() => {
        if (filter.value === 'ALL') return games.value
        return games.value.filter(g => g.WL === filter.value)
    })

    onMounted(loadGames)

    return {
        games,
        filter,
        filteredGames,
        hideScoresModel,
        loadGames
    }
}