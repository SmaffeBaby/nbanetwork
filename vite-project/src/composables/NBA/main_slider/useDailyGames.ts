import { ref, onMounted, onUnmounted } from 'vue'
import type { Game } from '../../../api/api.ts'
import { formatGameTime } from '../utils'
import { getTodayDateKey, shiftDateKey } from '../games/useGamesByDate'

export function useDailyGames() {
    const gamesList = ref<Game[]>([])
    const selectedTimezone = ref('Europe/Moscow')
    const error = ref<string | null>(null)
    const loading = ref(true)
    let pending = false
    let timer: ReturnType<typeof setInterval> | undefined
    const loadGames = async () => {
        if (pending) return
        pending = true
        try {
            const dateKey = shiftDateKey(getTodayDateKey(), 1)
            const res = await fetch(`/api/daily-games?date=${dateKey}`, { signal: AbortSignal.timeout(30000) })
            if (!res.ok) throw new Error(`HTTP error: ${res.status}`)
            gamesList.value = await res.json()
            error.value = null
        } catch {
            error.value = 'Не удалось загрузить игры'
        } finally {
            loading.value = false
            pending = false
        }
    }
    onMounted(() => {
        loadGames()
        timer = setInterval(loadGames, 60000)
    })
    onUnmounted(() => clearInterval(timer))
    return { gamesList, selectedTimezone, error, loading, formatGameTime }
}
export type { Game } from '../../../api/api.ts'
