import { computed } from 'vue'
import type { Ref } from 'vue'
import { getPlayerImage } from './useTeamContracts'
import type { ContractOptionType, ContractPlayer, TeamContracts } from './useTeamContracts'

export type ContractTableSalary = {
    year: string
    salary: number | null
    option: ContractOptionType
}

export type ContractTableRow = ContractPlayer & {
    image: string
    playerPath: string
    yearSalaries: ContractTableSalary[]
}

export function useContractsTable(contracts: Ref<TeamContracts | null>) {
    const years = computed(() => contracts.value?.years || [])

    const rows = computed<ContractTableRow[]>(() => {
        const activeYears = years.value
        if (!contracts.value || !activeYears.length) return []

        return contracts.value.players.map(player => ({
            ...player,
            image: getPlayerImage(player.nbaPlayerId, player.bbrefSlug),
            playerPath: `/player/${encodeURIComponent(player.name)}`,
            yearSalaries: activeYears.map(year => ({
                year,
                salary: player.salaries?.[year] ?? null,
                option: player.options?.[year] ?? null
            }))
        }))
    })

    const totals = computed(() =>
        Object.fromEntries(
            years.value.map(year => [year, contracts.value?.totalsByYear?.[year] ?? null])
        )
    )

    const guaranteedTotal = computed(() =>
        rows.value.reduce((sum, row) => sum + (row.guaranteed || 0), 0)
    )

    return {
        years,
        rows,
        totals,
        guaranteedTotal
    }
}
