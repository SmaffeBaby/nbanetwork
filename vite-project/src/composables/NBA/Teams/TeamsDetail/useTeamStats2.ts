import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import axios from 'axios'

export function useTeamStats2(
    teamId: number,
    season: Ref<string>,
    seasonType: Ref<'regular' | 'playoffs'>
) {
    const stats = ref<any>(null)
    const loading = ref(false)

    const buildStatsFromGames = (games: any[]) => {
        const wins = games.filter(g => g.WL === 'W').length
        const losses = games.filter(g => g.WL === 'L').length
        const gamesCount = wins + losses
        const points = games.map(g => Number(g.PTS) || 0)
        const pointDiffs = games.map(g => Number(g.PLUS_MINUS) || 0)
        const avg = (values: number[]) =>
            values.length
                ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
                : 0

        const homeGames = games.filter(g => !String(g.MATCHUP || '').includes('@'))
        const roadGames = games.filter(g => String(g.MATCHUP || '').includes('@'))
        const formatRecord = (rows: any[]) => {
            const rowWins = rows.filter(g => g.WL === 'W').length
            const rowLosses = rows.filter(g => g.WL === 'L').length
            return `${rowWins}-${rowLosses}`
        }

        return {
            WINS: wins,
            LOSSES: losses,
            WinPCT: gamesCount ? wins / gamesCount : 0,
            PlayoffRank: '-',
            PointsPG: avg(points),
            OppPointsPG: avg(points.map((value, index) => value - pointDiffs[index])),
            DiffPointsPG: avg(pointDiffs),
            HOME: formatRecord(homeGames),
            ROAD: formatRecord(roadGames),
            L10: formatRecord(games.slice(0, 10))
        }
    }

    const fetchStats = async () => {
        if (!teamId) return

        loading.value = true

        try {
            if (seasonType.value === 'playoffs') {
                const res = await axios.get(
                    `/api/team-games/${teamId}/${season.value}?season_type=playoffs`
                )

                const data = res.data
                if (!data?.headers || !data?.rowSet) {
                    stats.value = null
                    return
                }

                const games = data.rowSet.map((row: any[]) => {
                    const obj: any = {}
                    data.headers.forEach((h: string, i: number) => {
                        obj[h] = row[i]
                    })
                    return obj
                })

                stats.value = buildStatsFromGames(games)
                return
            }

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

    watch([season, seasonType], fetchStats, { immediate: true })

    return {
        stats,
        loading,
        fetchStats
    }
}