import { ref, onMounted } from 'vue'
import axios from 'axios'

export function useTeamUpcomingGames(teamId: number) {
    const games = ref<any[]>([])

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)

        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit'
        })
    }

    const convertToMoscowTime = (dateStr: string, timeStr: string) => {
        if (!timeStr || timeStr === '—') return '—'

        try {
            const clean = timeStr.replace(' ET', '')

            const [time, modifier] = clean.split(' ')
            let [hours, minutes] = time.split(':').map(Number)

            if (modifier === 'pm' && hours !== 12) hours += 12
            if (modifier === 'am' && hours === 12) hours = 0

            const baseDate = new Date(dateStr)
            baseDate.setUTCHours(hours + 4, minutes)

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
                FORMATTED_DATE: formatDate(obj.GAME_DATE),
                MOSCOW_TIME: convertToMoscowTime(obj.GAME_DATE, obj.GAME_TIME)
            }
        })
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
        parseMatchup
    }
}