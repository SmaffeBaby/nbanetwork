import { computed, ref, type Ref } from 'vue'

export type ConferenceFilter = 'All' | 'East' | 'West'

export type BracketTeam = {
    name: string
    abbr: string
    seed: string
    logo: string
    conference: 'East' | 'West'
    dots: { index: number; active: boolean }[]
}

export type BracketSeries = {
    key: string
    index: number
    round: string
    winner: string
    teams: BracketTeam[]
}

const PREFERRED_ROUND_ORDER = [
    'First Round',
    'Conference Semifinals',
    'Conference Finals',
    'NBA Finals',
    'Series'
]

export function usePlayoffBracket(series: Ref<BracketSeries[]>) {
    const conferences: ConferenceFilter[] = ['All', 'West', 'East']
    const selectedConference = ref<ConferenceFilter>('All')

    const filteredSeries = computed(() => {
        if (selectedConference.value === 'All') return series.value

        return series.value.filter(item =>
            item.teams.some(team => team.conference === selectedConference.value)
        )
    })

    const rounds = computed(() => {
        return PREFERRED_ROUND_ORDER.filter(round =>
            filteredSeries.value.some(item => item.round === round)
        )
    })

    const groupedSeries = computed<Record<string, BracketSeries[]>>(() => {
        return filteredSeries.value.reduce((acc, item) => {
            if (!acc[item.round]) acc[item.round] = []
            acc[item.round].push(item)
            return acc
        }, {} as Record<string, BracketSeries[]>)
    })

    return {
        conferences,
        selectedConference,
        filteredSeries,
        rounds,
        groupedSeries
    }
}
