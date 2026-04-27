import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import axios from 'axios'

export function useTeamStats2(teamId: number, season: Ref<string>) {
    const stats = ref<any>(null)
    const loading = ref(false)

    const fetchStats = async () => {
        if (!teamId) return

        loading.value = true

        try {
            const res = await axios.get(`/api/standings/${season.value}`)

            const resultSet = res.data.resultSets?.[0]
            if (!resultSet) return

            const headers = resultSet.headers

            const teams = resultSet.rowSet.map((row: any[]) => {
                const obj: any = {}
                headers.forEach((h: string, i: number) => {
                    obj[h] = row[i]
                })
                return obj
            })

            stats.value = teams.find(
                (t: any) => t.TeamID == teamId
            ) || null

        } catch (e) {
            console.error('Team stats error:', e)
        } finally {
            loading.value = false
        }
    }

    watch(season, fetchStats, { immediate: true })

    return {
        stats,
        loading,
        fetchStats
    }
}