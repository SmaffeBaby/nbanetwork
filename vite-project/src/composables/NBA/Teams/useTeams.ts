import { computed } from 'vue'
import { useCurrentSeason } from '../useCurrentSeason'
import { useStandingsQuery } from '../Standings/useStandingsQuery'
import { teamsFullNames } from '../../../constants/TeamFullName'

export function useTeams(season?: string) {
    const { season: selectedSeason } = useCurrentSeason()
    if (season) selectedSeason.value = season
    const query = useStandingsQuery(selectedSeason)
    const teams = computed(() => query.data.value ?? [])
    const loading = computed(() => query.isPending.value)
    const error = computed(() => query.error.value?.message ?? null)
    const fetchTeams = () => query.refetch()

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

    const easternTeams = computed(() => getTeams('East'))
    const westernTeams = computed(() => getTeams('West'))

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