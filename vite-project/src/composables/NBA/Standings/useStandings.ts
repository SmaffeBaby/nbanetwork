import { computed } from 'vue'
import { useCurrentSeason } from '../useCurrentSeason'
import { useStandingsQuery } from './useStandingsQuery'
import { teamsFullNames } from '../../../constants/TeamFullName.ts'

export function useStandings() {
    const { season: selectedSeason, seasons } = useCurrentSeason(1990)
    const query = useStandingsQuery(selectedSeason)
    const teams = computed(() => query.data.value ?? [])
    const loading = computed(() => query.isPending.value)
    const error = computed(() => query.error.value?.message ?? '')
    const fetchStandings = () => query.refetch()

    const reverseMap = Object.fromEntries(
        Object.entries(teamsFullNames).map(([k, v]) => [v, k])
    )

    const getLogo = (team: any) => {
        if (team.TeamCity === 'LA' && team.TeamName === 'Clippers') {
            return '/logos/LAC.svg'
        }

        const abbr =
            team.TeamAbbreviation ||
            reverseMap[`${team.TeamCity} ${team.TeamName}`]

        return abbr ? `/logos/${abbr}.svg` : ''
    }

    const getTeams = (conf: string) =>
        teams.value.filter((t) => t.Conference === conf)

    const getField = (team: any, ...keys: string[]) => {
        for (const k of keys) {
            if (team[k] !== undefined && team[k] !== null) return team[k]
        }
        return '-'
    }

    const rowClass = (i: number) => {
        if (i === 5) return 'border-b-2 border-dashed border-gray-500'
        if (i === 9) return 'border-b-2 border-blue-500'
        return ''
    }

    const getStatus = (i: number) => {
        if (i < 6) return 'x'
        if (i < 10) return 'pi'
        return ''
    }

    return {
        teams,
        loading,
        error,
        selectedSeason,
        seasons,
        getLogo,
        getTeams,
        getField,
        rowClass,
        getStatus,
        fetchStandings,
    }
}