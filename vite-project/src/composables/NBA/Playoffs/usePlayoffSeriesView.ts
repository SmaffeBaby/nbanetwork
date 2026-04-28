import { computed, ref, type Ref } from 'vue'

export type PlayoffGame = {
    GAME_ID: string
    GAME_DATE: string
    home: { team: string; pts: number; wl: string }
    away: { team: string; pts: number; wl: string }
}

export type PlayoffSeries = {
    key: string
    teamA: string
    teamB: string
    games: PlayoffGame[]
}

type Conference = 'East' | 'West'

type UsePlayoffSeriesViewOptions = {
    series: Ref<PlayoffSeries[]>
    formatTeam: (team: string) => string
    getSeed: (team: string) => string
    getTeamAbbr: (team: string) => string
    getLogo: (team: string) => string
    getTeamConference: (team: string) => Conference
}

export function usePlayoffSeriesView({
    series,
    formatTeam,
    getSeed,
    getTeamAbbr,
    getLogo,
    getTeamConference
}: UsePlayoffSeriesViewOptions) {
    const selectedRound = ref('All')
    const selectedTeam = ref('All')
    const selectedStatus = ref('All')
    const selectedModalSeriesIndex = ref<number | null>(null)

    const decoratedSeries = computed(() => {
        const items = series.value.map((s, index) => ({
            index,
            series: s,
            startTime: getSeriesStartTime(s)
        }))

        const sortedIndexes = [...items]
            .sort((a, b) => a.startTime - b.startTime)
            .map(item => item.index)

        return items.map(item => {
            const roundIndex = sortedIndexes.indexOf(item.index)
            const wins = getSeriesWins(item.series)
            const maxWins = Math.max(wins.teamA, wins.teamB)

            return {
                ...item,
                round: getRoundLabel(roundIndex, series.value.length),
                startDate: formatDate(item.series.games[0]?.GAME_DATE),
                isFinished: maxWins >= 4,
                winner: maxWins >= 4
                    ? wins.teamA > wins.teamB
                        ? item.series.teamA
                        : item.series.teamB
                    : ''
            }
        })
    })

    const roundOptions = computed(() => {
        return [...new Set(decoratedSeries.value.map(item => item.round))]
    })

    const teamOptions = computed(() => {
        const teams = new Set<string>()

        for (const item of decoratedSeries.value) {
            teams.add(formatTeam(item.series.teamA))
            teams.add(formatTeam(item.series.teamB))
        }

        return [...teams].sort((a, b) => a.localeCompare(b))
    })

    const filteredSeries = computed(() => {
        return decoratedSeries.value.filter(item => {
            const roundMatches =
                selectedRound.value === 'All' || item.round === selectedRound.value
            const teamMatches =
                selectedTeam.value === 'All' ||
                formatTeam(item.series.teamA) === selectedTeam.value ||
                formatTeam(item.series.teamB) === selectedTeam.value
            const statusMatches =
                selectedStatus.value === 'All' ||
                (selectedStatus.value === 'Finished' && item.isFinished) ||
                (selectedStatus.value === 'In progress' && !item.isFinished)

            return roundMatches && teamMatches && statusMatches
        })
    })

    const bracketSeries = computed(() => {
        return filteredSeries.value.map(item => ({
            key: item.series.key,
            index: item.index,
            round: item.round,
            winner: item.winner ? formatTeam(item.winner) : '',
            teams: [item.series.teamA, item.series.teamB].map(team => ({
                name: formatTeam(team),
                abbr: getTeamAbbr(team),
                seed: getSeed(team),
                logo: getLogo(team),
                conference: getTeamConference(team),
                dots: getWinDots(item.series, team)
            }))
        }))
    })

    const modalSeries = computed(() => {
        if (selectedModalSeriesIndex.value === null) return null

        return decoratedSeries.value.find(item =>
            item.index === selectedModalSeriesIndex.value
        ) || null
    })

    function openSeriesModal(index: number) {
        selectedModalSeriesIndex.value = index
    }

    function closeSeriesModal() {
        selectedModalSeriesIndex.value = null
    }

    function resetFilters() {
        selectedRound.value = 'All'
        selectedTeam.value = 'All'
        selectedStatus.value = 'All'
    }

    return {
        selectedRound,
        selectedTeam,
        selectedStatus,
        decoratedSeries,
        roundOptions,
        teamOptions,
        filteredSeries,
        bracketSeries,
        modalSeries,
        getTeamWins,
        openSeriesModal,
        closeSeriesModal,
        resetFilters
    }
}

function getSeriesStartTime(s: PlayoffSeries) {
    const dates = s.games
        .map(g => new Date(g.GAME_DATE).getTime())
        .filter(Boolean)

    return dates.length ? Math.min(...dates) : 0
}

function getRoundLabel(index: number, total: number) {
    if (total >= 15) {
        if (index < 8) return 'First Round'
        if (index < 12) return 'Conference Semifinals'
        if (index < 14) return 'Conference Finals'
        return 'NBA Finals'
    }

    if (total >= 14) {
        if (index < 8) return 'First Round'
        if (index < 12) return 'Conference Semifinals'
        return 'Conference Finals'
    }

    if (total >= 12) {
        if (index < 8) return 'First Round'
        return 'Conference Semifinals'
    }

    if (total >= 8) {
        return 'First Round'
    }

    if (total >= 7) {
        if (index < 4) return 'Conference Semifinals'
        if (index < 6) return 'Conference Finals'
        return 'NBA Finals'
    }

    return 'Series'
}

function getSeriesWins(s: PlayoffSeries) {
    let teamA = 0
    let teamB = 0

    for (const g of s.games) {
        if (g.home.wl === 'W') {
            g.home.team === s.teamA ? teamA++ : teamB++
        }

        if (g.away.wl === 'W') {
            g.away.team === s.teamA ? teamA++ : teamB++
        }
    }

    return { teamA, teamB }
}

function getTeamWins(s: PlayoffSeries, team: string) {
    const wins = getSeriesWins(s)
    return team === s.teamA ? wins.teamA : wins.teamB
}

function getWinDots(s: PlayoffSeries, team: string) {
    const wins = getTeamWins(s, team)

    return Array.from({ length: 4 }, (_, index) => ({
        index,
        active: index < wins
    }))
}

function formatDate(date?: string) {
    if (!date) return 'TBD'

    return date
}
