import { computed, ref, watch } from 'vue'
import { teamsFullNames } from '../../../../constants/TeamFullName.ts'
import { nbaTeamLogos } from '../../../../constants/nbaTeamLogo.ts'

export function useGamePlayersTable(players: any, recap: any) {
    const search = ref('')
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
        const q = search.value.toLowerCase()

        return [...players.value]
            .filter((p: any) =>
                (p.name || '').toLowerCase().includes(q) ||
                (p.position || '').toLowerCase().includes(q)
            )
            .filter((p: any) => {
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
        search,
        sortKey,
        sortDir,
        activeTeam,
        teams,

        filtered,

        setSort,
        sortArrow
    }
}