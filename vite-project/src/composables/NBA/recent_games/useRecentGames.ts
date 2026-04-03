import { ref, onMounted, watch } from 'vue'
import type { Game } from '../../../api/api'

export function useRecentGames() {

    const gamesList = ref<Game[]>([])
    const error = ref<string | null>(null)
    const hideScores = ref(true)
    const collapsed = ref(false)
    const isLoading = ref(false)

    const gamesCache = new Map<string, Game[]>()
    const rawCache = new Map<string, Game[]>()

    let timeout: ReturnType<typeof setTimeout> | null = null

    const currentDate = ref<Date>(new Date())
    currentDate.value.setHours(0, 0, 0, 0)

    const formatGameTime = (iso: string) => {
        return new Intl.DateTimeFormat('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Moscow',
        }).format(new Date(iso))
    }

    const getWeekday = (date: Date) => {
        const weekdays = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота']
        return weekdays[date.getDay()]
    }

    const getDateKey = (date: Date) => date.toISOString().split('T')[0]

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

    const toMSK = (date: Date) => {
        return new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }))
    }

    const getGamesByDate = async (dateStr: string, retries = 2): Promise<Game[]> => {
        if (rawCache.has(dateStr)) {
            return rawCache.get(dateStr)!
        }

        try {
            const res = await fetch(`/api/daily-games?date=${dateStr}`)
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

            const data = await res.json()
            const games: Game[] = Array.isArray(data) ? data : []

            rawCache.set(dateStr, games)
            return games
        } catch (err: any) {
            if (err?.response?.status === 429 && retries > 0) {
                await delay(1000)
                return getGamesByDate(dateStr, retries - 1)
            }
            throw err
        }
    }

    const loadGames = async (date: Date) => {
        if (isLoading.value) return

        try {
            isLoading.value = true

            const key = getDateKey(date)

            if (gamesCache.has(key)) {
                gamesList.value = gamesCache.get(key)!
                return
            }

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

                await delay(150)
            }

            const filtered = allGames.filter(game => {
                const gameMSK = toMSK(new Date(game.datetime))
                return gameMSK >= startMSK && gameMSK <= endMSK
            })

            gamesCache.set(key, filtered)
            gamesList.value = filtered
            error.value = null

        } catch (err: any) {
            console.error('Ошибка при загрузке игр:', err)
            if (err?.response?.status === 429) {
                error.value = 'Лимит API'
            } else {
                error.value = 'Не удалось загрузить игры'
            }
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

    watch(currentDate, (newDate) => {
        if (!newDate) return
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
            loadGames(newDate)
        }, 800)
    })

    onMounted(() => {
        loadGames(currentDate.value)
    })

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