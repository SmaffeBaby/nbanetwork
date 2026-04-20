import { computed, ref, watch, type Ref } from 'vue'
import { teamsFullNames } from '../../../../constants/TeamFullName.ts'
import { nbaTeamLogos } from '../../../../constants/nbaTeamLogo.ts'

type Filters = {
    search: string
    quarter: number | null
}

export function useGamePlayersTable(
    players: Ref<any[]>,
    recap: Ref<any>,
    filters: Ref<Filters>
) {
    const sortKey = ref('points')
    const sortDir = ref<'asc' | 'desc'>('desc')
    const activeTeam = ref('')

    const num = (v: any) => {
        const n = Number(v)
        return Number.isFinite(n) ? n : 0
    }

    function setSort(key: string) {
        if (sortKey.value === key) {
            sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
        } else {
            sortKey.value = key
            sortDir.value = 'desc'
        }
    }

    function sortArrow(key: string) {
        if (sortKey.value !== key) return ''
        return sortDir.value === 'desc' ? '↓' : '↑'
    }

    const teams = computed(() => {
        const home = recap.value?.meta?.homeAbbr
        const away = recap.value?.meta?.awayAbbr

        return [away, home]
            .filter(Boolean)
            .map((abbr: string) => ({
                abbr,
                name: teamsFullNames?.[abbr] || abbr,
                logo: nbaTeamLogos?.find((l: string) => l.includes(abbr)) || ''
            }))
    })

    watch(
        recap,
        (val) => {
            if (!activeTeam.value && val?.meta?.awayAbbr) {
                activeTeam.value = val.meta.awayAbbr
            }
        },
        { immediate: true }
    )

    const filtered = computed(() => {
        const key = sortKey.value
        const q = (filters.value.search || '').toLowerCase().trim()

        return [...(players.value || [])]

            .filter((p: any) => {
                if (!q) return true

                return (
                    (p.name || '').toLowerCase().includes(q) ||
                    (p.position || '').toLowerCase().includes(q)
                )
            })

            .filter((p: any) => {
                if (!activeTeam.value) return true

                const isHome = recap.value?.players?.home?.some(
                    (x: any) => String(x.personId) === p.PLAYER_ID
                )

                const team = isHome
                    ? recap.value?.meta?.homeAbbr
                    : recap.value?.meta?.awayAbbr

                return team === activeTeam.value
            })

            .sort((a: any, b: any) => {
                const A = num(a[key])
                const B = num(b[key])
                return sortDir.value === 'desc' ? B - A : A - B
            })
    })

    return {
        sortKey,
        sortDir,
        activeTeam,
        teams,

        filtered,

        setSort,
        sortArrow
    }
}