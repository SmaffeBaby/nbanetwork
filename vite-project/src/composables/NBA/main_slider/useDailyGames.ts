import { ref, onMounted } from 'vue'
import type { Game } from '../../../api/api.ts'
import { formatGameTime, toMSK } from '../utils'

export function useDailyGames() {
    const gamesList = ref<Game[]>([])
    const selectedTimezone = ref('Europe/Moscow')
    const error = ref<string | null>(null)

    const CACHE_VERSION = 'v4'

    const getTomorrowMSK = () => {
        const nowMSK = toMSK(new Date())
        nowMSK.setHours(0, 0, 0, 0)
        nowMSK.setDate(nowMSK.getDate() + 1)
        return nowMSK
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

    const loadGames = async () => {
        try {
            const targetDate = getTomorrowMSK()
            const dateKey = targetDate.toISOString().slice(0, 10)
            const cacheKey = `games_${dateKey}_${CACHE_VERSION}`

            const cached = localStorage.getItem(cacheKey)
            if (cached) {
                gamesList.value = JSON.parse(cached)
                return
            }

            const res = await fetch(`/api/daily-games?date=${dateKey}`)
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

            const data: Game[] = await res.json()
            gamesList.value = data
            localStorage.setItem(cacheKey, JSON.stringify(data))
            error.value = null
        } catch (err) {
            console.error('Ошибка при загрузке игр:', err)
            error.value = 'Не удалось загрузить игры'
            gamesList.value = []
        }
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