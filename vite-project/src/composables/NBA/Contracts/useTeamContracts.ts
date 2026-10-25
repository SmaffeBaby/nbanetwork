import { computed, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getCurrentNbaSeason } from '../../../utils/generateNbaSeasons'
import { useCurrentSeason } from '../useCurrentSeason'
import type { Ref } from 'vue'
import { useSalaryCapRules } from './useSalaryCapRules'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export type ContractOptionType = 'player' | 'team' | null

export type ContractPlayer = {
    name: string
    age: number | null
    href: string | null
    bbrefSlug: string | null
    nbaPlayerId?: string | number | null
    salaries: Record<string, number | null>
    options: Record<string, ContractOptionType>
    guaranteed: number | null
}

export type ContractCapKey = 'salaryCap' | 'luxuryTax' | 'firstApron' | 'secondApron' | 'salaryFloor'

export type TeamContracts = {
    source: string
    sourceStatus?: 'live' | 'hoopshype' | 'fallback'
    stale?: boolean
    fetchedAt?: string
    archive?: { firstSeason: string; importedSeasons: number; importRunning: boolean }
    sourcesByYear?: Record<string, string>
    fetchedAtByYear?: Record<string, string>
    fallbackReason?: string
    teamAbbr: string
    years: string[]
    players: ContractPlayer[]
    totalsByYear: Record<string, number>
    caps: Partial<Record<ContractCapKey, Record<string, number | null>>>
}

export type SalaryStackItem = ContractPlayer & {
    salary: number
    option: ContractOptionType
}

const DEFAULT_CAPS: Partial<Record<ContractCapKey, Record<string, number>>> = {
    salaryCap: { '2025-26': 154_647_000 },
    luxuryTax: { '2025-26': 187_895_000 },
    firstApron: { '2025-26': 195_945_000 },
    secondApron: { '2025-26': 207_824_000 },
    salaryFloor: { '2025-26': 139_182_000 }
}

export const getPlayerImage = (playerId?: string | number | null, slug?: string | null) => {
    if (playerId) return `${API_BASE}/api/player-image/${playerId}`

    return slug
        ? `https://www.basketball-reference.com/req/202106291/images/headshots/${slug}.jpg`
        : ''
}

export function useTeamContracts(teamAbbr: Ref<string>) {
    const selectedYear = ref('')
    const { currentSeason } = useCurrentSeason()
    const { getCapLabel, getCapColor } = useSalaryCapRules()
    const query = useQuery({
        queryKey: computed(() => ['team-contracts', teamAbbr.value]),
        enabled: computed(() => Boolean(teamAbbr.value)),
        queryFn: async ({ queryKey: [, team], signal }): Promise<TeamContracts> => {
            const response = await fetch(`${API_BASE}/api/team-contracts/${team}`, {
                signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]), cache: 'no-cache'
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.message || 'Не удалось загрузить контракты')
            if (!Array.isArray(data.players) || !Array.isArray(data.years)) throw new Error('Некорректные данные контрактов')
            return data
        },
        staleTime: 5 * 60_000,
        refetchInterval: 60_000,
        gcTime: 60 * 60_000,
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true
    })
    const contracts = computed(() => query.data.value ?? null)
    const loading = computed(() => query.isPending.value)
    const error = computed(() => query.error.value?.message ?? null)
    const fetchContracts = () => query.refetch()
    watch([contracts, currentSeason], ([data, season]) => {
        if (!data) return
        if (!selectedYear.value || !data.years.includes(selectedYear.value)) {
            selectedYear.value = data.years.includes(season) ? season : data.years[0] || ''
        }
    }, { immediate: true })

    const playersForYear = computed<SalaryStackItem[]>(() => {
        const year = selectedYear.value
        if (!contracts.value || !year) return []

        return contracts.value.players
            .map(player => ({
                ...player,
                salary: player.salaries?.[year] ?? 0,
                option: player.options?.[year] ?? null
            }))
            .filter(player => player.salary > 0)
            .sort((a, b) => b.salary - a.salary)
    })

    const tableContracts = computed<TeamContracts | null>(() => {
        if (!contracts.value || !selectedYear.value) return null
        const years = selectedYear.value < getCurrentNbaSeason()
            ? [selectedYear.value]
            : contracts.value.years.filter(year => year >= selectedYear.value).sort()
        return { ...contracts.value, years,
            players: contracts.value.players.filter(player => years.some(year => (player.salaries[year] ?? 0) > 0)) }
    })

    const totalSalary = computed(() =>
        contracts.value?.totalsByYear?.[selectedYear.value]
        ?? playersForYear.value.reduce((sum, player) => sum + player.salary, 0)
    )

    const visualStackTotal = computed(() =>
        playersForYear.value.reduce((sum, player) => sum + player.salary, 0)
    )

    const capLines = computed(() => {
        const year = selectedYear.value
        const caps = contracts.value?.caps || {}

        return [
            { key: 'secondApron', label: getCapLabel('secondApron'), color: getCapColor('secondApron'), value: caps.secondApron?.[year] ?? DEFAULT_CAPS.secondApron?.[year] ?? null },
            { key: 'firstApron', label: getCapLabel('firstApron'), color: getCapColor('firstApron'), value: caps.firstApron?.[year] ?? DEFAULT_CAPS.firstApron?.[year] ?? null },
            { key: 'luxuryTax', label: getCapLabel('luxuryTax'), color: getCapColor('luxuryTax'), value: caps.luxuryTax?.[year] ?? DEFAULT_CAPS.luxuryTax?.[year] ?? null },
            { key: 'salaryCap', label: getCapLabel('salaryCap'), color: getCapColor('salaryCap'), value: caps.salaryCap?.[year] ?? DEFAULT_CAPS.salaryCap?.[year] ?? null },
            { key: 'salaryFloor', label: getCapLabel('salaryFloor'), color: getCapColor('salaryFloor'), value: caps.salaryFloor?.[year] ?? DEFAULT_CAPS.salaryFloor?.[year] ?? null }
        ].filter((line): line is { key: ContractCapKey, label: string, color: string, value: number } =>
            typeof line.value === 'number' && line.value > 0
        )
    })

    const chartMax = computed(() => {
        const maxLine = Math.max(0, ...capLines.value.map(line => line.value))
        return Math.max(visualStackTotal.value, maxLine) * 1.08
    })

    const formatMoney = (value: number | null | undefined) => {
        if (!value) return '-'

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(value)
    }

    const getSegmentColor = (index: number, option: ContractOptionType) => {
        if (option === 'player') return '#2563eb'
        if (option === 'team') return '#16a34a'

        const colors = ['#ff5c4d', '#18a8e8', '#ffc928', '#f47bb1', '#4bd936', '#20d3c5', '#91d5ff', '#a3e635']
        return colors[index % colors.length]
    }

    return {
        contracts,
        selectedYear,
        tableContracts,
        loading,
        error,
        playersForYear,
        totalSalary,
        visualStackTotal,
        capLines,
        chartMax,
        fetchContracts,
        formatMoney,
        getPlayerImage,
        getSegmentColor
    }
}
