import { ref, computed, onMounted } from 'vue'
import { teamsFullNames } from '../../../constants/TeamFullName'

export function useTeams(season?: string) {
    const teams = ref<any[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const selectedSeason = ref(season || '2025-26')

    const reverseMap = Object.fromEntries(
        Object.entries(teamsFullNames).map(([k, v]) => [v, k])
    )

    const getLogo = (team: any) => {
        if (team.TeamCity === 'LA' && team.TeamName === 'Clippers') return '/logos/LAC.svg'
        const abbr = team.TeamAbbreviation || reverseMap[`${team.TeamCity} ${team.TeamName}`]
        return abbr ? `/logos/${abbr}.svg` : ''
    }

    const getTeams = (conf: string) => teams.value.filter(t => t.Conference === conf)

    const getFullName = (team: any) => {
        return teamsFullNames[team.TeamAbbreviation] || `${team.TeamCity} ${team.TeamName}`
    }

    const getRecord = (team: any) => {
        const wins = team.WINS ?? team.W ?? 0
        const losses = team.LOSSES ?? team.L ?? 0
        return `${wins} - ${losses}`
    }

    const getField = (team: any, ...keys: string[]) => {
        for (const k of keys) {
            if (team[k] !== undefined && team[k] !== null) return team[k]
        }
        return '-'
    }

    const fetchTeams = async () => {
        loading.value = true
        error.value = null
        try {
            const res = await fetch(`/api/standings/${selectedSeason.value}`)
            const data = await res.json()
            const rs = data.resultSet || data.resultSets?.[0]
            if (!rs) return

            teams.value = rs.rowSet.map((row: any[]) => {
                const obj: Record<string, any> = {}
                rs.headers.forEach((h: string, i: number) => (obj[h] = row[i]))
                return obj
            })
        } catch (err: any) {
            error.value = err.message || 'Failed to fetch teams'
        } finally {
            loading.value = false
        }
    }

    const easternTeams = computed(() => getTeams('East'))
    const westernTeams = computed(() => getTeams('West'))

    onMounted(() => {
        fetchTeams()
        setInterval(fetchTeams, 100000)
    })

    return {
        teams,
        loading,
        error,
        selectedSeason,
        getTeams,
        getLogo,
        getFullName,
        getRecord,
        getField,
        fetchTeams,
        easternTeams,
        westernTeams
    }
}