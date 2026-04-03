import { ref, onMounted } from 'vue'
import type { Game } from '../../../api/api.ts'

export function useDailyGames() {
    const gamesList = ref<Game[]>([])
    const selectedTimezone = ref('Europe/Moscow')
    const error = ref<string | null>(null)

    const CACHE_VERSION = 'v4'

    const formatGameTime = (iso: string) => {
        return new Intl.DateTimeFormat('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: selectedTimezone.value,
        }).format(new Date(iso))
    }

    const toMSK = (date: Date) => {
        return new Date(
            date.toLocaleString('en-US', { timeZone: 'Europe/Moscow' })
        )
    }

    const getTomorrowMSK = () => {
        const now = new Date()
        const nowMSK = new Date(
            now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' })
        )
        nowMSK.setHours(0, 0, 0, 0)
        nowMSK.setDate(nowMSK.getDate() + 1)
        return nowMSK
    }

    const updateScores = () => {
        if (!Array.isArray(gamesList.value)) return

        gamesList.value = gamesList.value.map(game => {
            if (
                game.period === 0 &&
                game.home_team_score === 0 &&
                game.visitor_team_score === 0
            ) return game
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

            const dateStr = targetDate.toISOString().slice(0, 10)
            const res = await fetch(`/api/daily-games?date=${dateStr}`)
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