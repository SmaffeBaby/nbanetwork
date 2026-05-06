import { ref, onMounted } from 'vue'
import type { Game } from '../../../api/api.ts'
import { formatGameTime, getDateKey, toMSK } from '../utils'

export function useDailyGames() {
    const gamesList = ref<Game[]>([])
    const selectedTimezone = ref('Europe/Moscow')
    const error = ref<string | null>(null)

    const getTomorrowMSK = () => {
        const nowMSK = toMSK(new Date())
        nowMSK.setHours(0, 0, 0, 0)
        nowMSK.setDate(nowMSK.getDate() + 1)
        return nowMSK
    }

    const loadGames = async () => {
        try {
            const targetDate = getTomorrowMSK()
            const startMSK = new Date(targetDate)
            startMSK.setHours(0, 0, 0, 0)
            const endMSK = new Date(targetDate)
            endMSK.setHours(23, 59, 59, 999)

            const prevDate = new Date(targetDate.getTime() - 86400000)
            const nextDate = new Date(targetDate.getTime() + 86400000)
            const datesToFetch = [prevDate, targetDate, nextDate]

            let allGames: Game[] = []
            for (const d of datesToFetch) {
                const dateKey = getDateKey(d)
                const res = await fetch(`/api/daily-games?date=${dateKey}`)
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
                const data: Game[] = await res.json()
                allGames.push(...data)
            }

            gamesList.value = allGames.filter(game => {
                const gameMSK = toMSK(new Date(game.datetime))
                return gameMSK >= startMSK && gameMSK <= endMSK
            })

            error.value = null
        } catch (err) {
            console.error('Ошибка при загрузке игр:', err)
            error.value = 'Не удалось загрузить игры'
            gamesList.value = []
        }
    }

    const updateScores = () => {
        if (!Array.isArray(gamesList.value)) return

        gamesList.value = gamesList.value.map(game => {
            if (game.period === 0 && game.home_team_score === 0 && game.visitor_team_score === 0) return game
            if (game.status === 'Final') return game

            const randomScore = () => Math.floor(Math.random() * 3)
            return {
                ...game,
                home_team_score: (game.home_team_score ?? 0) + randomScore(),
                visitor_team_score: (game.visitor_team_score ?? 0) + randomScore(),
            }
        })
    }

    onMounted(() => {
        loadGames()
        setInterval(updateScores, 2000)
    })

    return {
        gamesList,
        selectedTimezone,
        error,
        formatGameTime,
    }
}

export type { Game } from '../../../api/api.ts'