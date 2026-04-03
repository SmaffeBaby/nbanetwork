import { ref, onMounted, watch } from 'vue'
import type { Game } from '../../../api/api'
import { formatGameTime, toMSK, getDateKey, getWeekday, delay } from '../utils'

export function useRecentGames() {
    const gamesList = ref<Game[]>([])
    const error = ref<string | null>(null)
    const hideScores = ref(true)
    const collapsed = ref(false)
    const isLoading = ref(false)

    const gamesCache = new Map<string, Game[]>()
    let timeout: ReturnType<typeof setTimeout> | null = null

    const CACHE_VERSION = 'v2'

    const currentDate = ref<Date>(new Date())
    currentDate.value.setHours(0, 0, 0, 0)

    const getGamesByDate = async (dateStr: string): Promise<Game[]> => {
        const cacheKey = `recent_games_${dateStr}_${CACHE_VERSION}`

        if (gamesCache.has(dateStr)) {
            return gamesCache.get(dateStr)!
        }

        const cached = localStorage.getItem(cacheKey)
        if (cached) {
            const parsed = JSON.parse(cached)
            gamesCache.set(dateStr, parsed)
            return parsed
        }

        try {
            const res = await fetch(`/api/daily-games?date=${dateStr}`)
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

            const data = await res.json()
            const games: Game[] = Array.isArray(data) ? data : []

            // сохраняем
            gamesCache.set(dateStr, games)
            localStorage.setItem(cacheKey, JSON.stringify(games))

            return games
        } catch (err: any) {
            console.error(`Ошибка загрузки ${dateStr}:`, err)

            if (cached) {
                return JSON.parse(cached)
            }

            return []
        }
    }

    const loadGames = async (date: Date) => {
        if (isLoading.value) return

        try {
            isLoading.value = true

            const key = getDateKey(date)

            const startMSK = new Date(date)
            startMSK.setHours(0, 0, 0, 0)

            const endMSK = new Date(date)
            endMSK.setHours(23, 59, 59, 999)

            const prevDate = new Date(date.getTime() - 86400000)
            const nextDate = new Date(date.getTime() + 86400000)

            const datesToFetch = [prevDate, date, nextDate]

            let allGames: Game[] = []

            for (const d of datesToFetch) {
                const games = await getGamesByDate(getDateKey(d))
                allGames.push(...games)
                await delay(200)
            }

            const filtered = allGames.filter(game => {
                const gameMSK = toMSK(new Date(game.datetime))
                return gameMSK >= startMSK && gameMSK <= endMSK
            })

            gamesList.value = filtered
            error.value = null
        } catch (err) {
            console.error('Ошибка при загрузке игр:', err)
            error.value = 'Не удалось загрузить игры'
            gamesList.value = []
        } finally {
            isLoading.value = false
        }
    }

    const prevDay = () => {
        const d = new Date(currentDate.value.getTime() - 86400000)
        d.setHours(0, 0, 0, 0)
        currentDate.value = d
    }

    const nextDay = () => {
        const d = new Date(currentDate.value.getTime() + 86400000)
        d.setHours(0, 0, 0, 0)
        currentDate.value = d
    }

    const selectDate = (date: Date | null) => {
        if (!date) return
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        currentDate.value = d
    }

    watch(currentDate, newDate => {
        if (!newDate) return
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => loadGames(newDate), 500)
    })

    onMounted(() => loadGames(currentDate.value))

    return {
        gamesList,
        hideScores,
        collapsed,
        currentDate,
        error,
        formatGameTime,
        getWeekday,
        prevDay,
        nextDay,
        selectDate,
    }
}

export type { Game } from '../../../api/api'