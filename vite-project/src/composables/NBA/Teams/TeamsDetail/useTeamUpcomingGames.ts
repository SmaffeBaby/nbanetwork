import { ref, onMounted } from 'vue'
import axios from 'axios'

export function useTeamUpcomingGames(teamId: number) {
    const games = ref<any[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    const getMoscowDateTime = (dateStr: string, timeStr: string) => {
        if (!timeStr || timeStr === '—' || timeStr.toUpperCase() === 'TBD') {
            return new Date(dateStr)
        }

        const clean = timeStr.replace(/\s*ET$/i, '').trim()
        const [time, modifierRaw] = clean.split(' ')
        const modifier = modifierRaw?.toLowerCase()
        const [rawHours, rawMinutes] = time.split(':').map(Number)

        if (!Number.isFinite(rawHours) || !Number.isFinite(rawMinutes)) {
            return new Date(dateStr)
        }

        let hours = rawHours
        if (modifier === 'pm' && hours !== 12) hours += 12
        if (modifier === 'am' && hours === 12) hours = 0

        const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
        let year
        let month
        let day

        if (datePart.includes('-')) {
            const parts = datePart.split('-').map(Number)
            year = parts[0]
            month = parts[1]
            day = parts[2]
        } else {
            const [rawMonth, rawDay, rawYear] = datePart.split(/[ /]/).map(Number)
            year = rawYear
            month = rawMonth
            day = rawDay
        }

        if (!year || !month || !day) {
            return new Date(dateStr)
        }

        return new Date(Date.UTC(year, month - 1, day, hours + 4, rawMinutes))
    }

    const formatDate = (dateStr: string, timeStr: string) => {
        const date = getMoscowDateTime(dateStr, timeStr)

        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit'
        })
    }

    const convertToMoscowTime = (dateStr: string, timeStr: string) => {
        if (!timeStr || timeStr === '—' || timeStr.toUpperCase() === 'TBD') return '—'

        try {
            const baseDate = getMoscowDateTime(dateStr, timeStr)

            return baseDate.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Moscow'
            })

        } catch (e) {
            return timeStr
        }
    }

    const loadGames = async () => {
        loading.value = true
        error.value = null

        try {
            const res = await axios.get(
                `/api/team-upcoming-games/${teamId}`
            )

            const resultSet = res.data.resultSets?.[0]
            if (!resultSet) return

            const headers = resultSet.headers

            games.value = resultSet.rowSet.map((row: any[]) => {
                const obj: any = {}

                headers.forEach((h: string, i: number) => {
                    obj[h] = row[i]
                })

                return {
                    ...obj,
                    FORMATTED_DATE: formatDate(obj.GAME_DATE, obj.GAME_TIME),
                    MOSCOW_TIME: convertToMoscowTime(obj.GAME_DATE, obj.GAME_TIME)
                }
            })
        } catch (e) {
            error.value = 'Не удалось загрузить будущие игры'
            games.value = []
        } finally {
            loading.value = false
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

    onMounted(loadGames)

    return {
        games,
        loading,
        error,
        parseMatchup
    }
}