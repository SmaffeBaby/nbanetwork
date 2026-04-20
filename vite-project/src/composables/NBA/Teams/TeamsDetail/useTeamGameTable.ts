import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../../../../stores/auth'

export function useTeamGameTable(teamId: number, season: string) {
    const auth = useAuthStore()

    const games = ref<any[]>([])
    const filter = ref<'ALL' | 'W' | 'L'>('ALL')

    const hideScoresModel = computed({
        get: () => auth.user?.hideScores ?? true,
        set: async (val: boolean) => {
            if (!auth.user) return
            await auth.updateHideScores(val)
        }
    })

    const loadGames = async () => {
        const res = await axios.get(
            `http://localhost:3000/api/team-games/${teamId}/${season}?season_type=all`
        )

        const data = res.data
        if (!data?.headers || !data?.rowSet) return

        const headers = data.headers

        games.value = data.rowSet.map((row: any[]) => {
            const obj: any = {}
            headers.forEach((h: string, i: number) => {
                obj[h] = row[i]
            })
            return obj
        })
    }

    const filteredGames = computed(() => {
        if (filter.value === 'ALL') return games.value
        return games.value.filter(g => g.WL === filter.value)
    })

    const parseDate = (dateStr: string) => {
        return new Date(dateStr)
    }

    const parseMatchup = (matchup: string) => {
        const isAway = matchup.includes('@')
        let [a, b] = matchup.split(isAway ? '@' : 'vs.')

        return {
            home: isAway ? b.trim() : a.trim(),
            away: isAway ? a.trim() : b.trim(),
            isAway
        }
    }

    const sortKey = ref<string>('GAME_DATE')
    const sortAsc = ref<boolean>(false)

    const sortedGames = computed(() => {
        return [...filteredGames.value].sort((a, b) => {
            let aVal = a[sortKey.value]
            let bVal = b[sortKey.value]

            if (sortKey.value === 'GAME_DATE') {
                aVal = parseDate(aVal)
                bVal = parseDate(bVal)
            }

            if (typeof aVal === 'string' && aVal.includes('.')) {
                aVal = parseFloat(aVal)
                bVal = parseFloat(bVal)
            }

            if (aVal < bVal) return sortAsc.value ? -1 : 1
            if (aVal > bVal) return sortAsc.value ? 1 : -1
            return 0
        })
    })

    const setSort = (key: string) => {
        if (sortKey.value === key) {
            sortAsc.value = !sortAsc.value
        } else {
            sortKey.value = key
            sortAsc.value = false
        }
    }

    const getSortIcon = (key: string) => {
        if (sortKey.value !== key) return ''
        return sortAsc.value ? '↑' : '↓'
    }

    onMounted(loadGames)

    return {
        filter,
        hideScoresModel,

        sortedGames,

        parseMatchup,

        setSort,
        getSortIcon
    }
}