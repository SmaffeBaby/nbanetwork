import { ref, watch, type Ref } from 'vue'
import axios from 'axios'

export function useTeamUpcomingGames(teamId: Ref<number>) {
    const games = ref<any[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    let requestId = 0
    const formatDate = (value: string) => new Date(value).toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', timeZone: 'Europe/Moscow'
    })
    const formatTime = (value: string) => new Date(value).toLocaleTimeString('ru-RU', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow'
    })

    const loadGames = async () => {
        const currentRequest = ++requestId
        if (!teamId.value) {
            games.value = []
            loading.value = false
            return
        }

        loading.value = true
        error.value = null

        try {
            const res = await axios.get(
                `/api/team-upcoming-games/${teamId.value}`, { timeout: 30000 }
            )

            const resultSet = res.data.resultSets?.[0]
            if (currentRequest !== requestId) return
            if (!resultSet) throw new Error('Invalid schedule response')

            const headers = resultSet.headers

            games.value = resultSet.rowSet.map((row: any[]) => {
                const obj: any = {}

                headers.forEach((h: string, i: number) => {
                    obj[h] = row[i]
                })

                return {
                    ...obj,
                    FORMATTED_DATE: formatDate(obj.GAME_DATE),
                    MOSCOW_TIME: formatTime(obj.GAME_DATE)
                }
            })
        } catch (e) {
            if (currentRequest !== requestId) return
            error.value = 'Не удалось загрузить будущие игры'
            games.value = []
        } finally {
            if (currentRequest === requestId) loading.value = false
        }
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

    watch(teamId, loadGames, { immediate: true })

    return {
        games,
        loading,
        error,
        parseMatchup
    }
}
