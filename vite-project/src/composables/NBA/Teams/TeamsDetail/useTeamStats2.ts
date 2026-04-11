import { ref, watch, toRef } from 'vue'
import axios from 'axios'

export function useTeamStats2(teamId: number, season: string) {
    const stats = ref<any>(null)
    const loading = ref(true)

    const teamIdRef = ref(teamId)

    const loadStats = async () => {
        if (!teamIdRef.value) return

        loading.value = true

        try {
            const res = await axios.get(`/api/standings/${season}`)

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
                (t: any) => t.TeamID == teamIdRef.value
            )

        } catch (e) {
            console.error('Team stats error:', e)
        } finally {
            loading.value = false
        }
    }

    watch(teamIdRef, loadStats, { immediate: true })

    return {
        stats,
        loading
    }
}