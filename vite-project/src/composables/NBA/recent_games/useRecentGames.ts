import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../../../stores/auth'

import { getDateKey } from '../utils'
import { TEAM_ID_MAP } from '../../../constants/nbaTeams'
import { teamsFullNames } from '../../../constants/TeamFullName'

const TEAM_ID_TO_ABBR: Record<number, string> = Object.fromEntries(
    Object.entries(TEAM_ID_MAP).map(([abbr, id]) => [id, abbr])
)

const API_BASE = import.meta.env.VITE_API_BASE ?? ''
const gamesCache = new Map<string, DailyGameDTO[]>()
const pendingGamesRequests = new Map<string, Promise<DailyGameDTO[]>>()

type DailyGameDTO = {
    GAME_ID: string
    GAME_DATE_EST: string
    HOME_TEAM_ID: number
    VISITOR_TEAM_ID: number
    HOME_TEAM_SCORE?: number
    VISITOR_TEAM_SCORE?: number
    GAME_STATUS?: string
    GAME_DATE_MSK?: string
    GAME_TIME_UTC?: string
}

export type RecentGame = {
    Game_ID: string
    datetime: string
    status: string
    statusTime: string
    gameDay: string
    home: { id: number; abbr: string; name: string; score: number | null }
    away: { id: number; abbr: string; name: string; score: number | null }
}

const getDayFromString = (dateStr: string): string => {
    if (!dateStr) return ''

    // поддержка "2026-04-13T01:00:00Z" или "2026-04-13 ..."
    return dateStr.slice(0, 10)
}

const getGameDateTime = (game: DailyGameDTO): string => {
    return game.GAME_TIME_UTC || ''
}

const getGameDay = (game: DailyGameDTO): string => {
    return game.GAME_DATE_MSK || getDayFromString(game.GAME_DATE_EST)
}

const formatMSKTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    if (!dateStr || isNaN(date.getTime())) return ''

    return new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Europe/Moscow',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date)
}

const convertETToMSKTime = (status: string): string => {
    if (!status) return ''

    const match = status.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
    if (!match) return status

    let hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const ampm = match[3].toLowerCase()

    if (ampm === 'pm' && hours !== 12) hours += 12
    if (ampm === 'am' && hours === 12) hours = 0

    hours = (hours + 7) % 24

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const getGamesByDate = async (dateStr: string): Promise<DailyGameDTO[]> => {
    const cached = gamesCache.get(dateStr)
    if (cached) return cached

    const pending = pendingGamesRequests.get(dateStr)
    if (pending) return pending

    const request = fetch(`${API_BASE}/api/games/by-date/${dateStr}`)
        .then(async (res) => {
            const data = await res.json()
            if (!res.ok) throw new Error('HTTP error')

            const games = Array.isArray(data) ? data : []
            gamesCache.set(dateStr, games)

            return games
        })
        .catch(() => [])
        .finally(() => pendingGamesRequests.delete(dateStr))

    pendingGamesRequests.set(dateStr, request)

    return request
}

const prefetchGamesByDate = (dateStr: string) => {
    if (gamesCache.has(dateStr) || pendingGamesRequests.has(dateStr)) return
    void getGamesByDate(dateStr)
}

const shiftDate = (date: Date, days: number) => {
    const shifted = new Date(date)
    shifted.setDate(shifted.getDate() + days)
    shifted.setHours(0, 0, 0, 0)

    return shifted
}

const prefetchAdjacentDays = (date: Date) => {
    const prev = getDateKey(shiftDate(date, -1))
    const next = getDateKey(shiftDate(date, 1))

    prefetchGamesByDate(prev)
    prefetchGamesByDate(next)
}

const hasCachedGames = (date: Date) => gamesCache.has(getDateKey(date))

const loadGamesForDate = async (date: Date) => {
    try {
        return await getGamesByDate(getDateKey(date))
    } catch {
        return []
    }
}

export function useRecentGames() {
    const authStore = useAuthStore()
    const { user } = storeToRefs(authStore)

    const gamesList = ref<RecentGame[]>([])
    const error = ref<string | null>(null)

    const hideScores = computed({
        get: () => user.value?.hideScores ?? true,
        set: (val: boolean) => {
            if (user.value) authStore.updateHideScores(val)
        }
    })

    const collapsed = ref(false)
    const isLoading = ref(false)
    let timeout: ReturnType<typeof setTimeout> | null = null
    let loadRequestId = 0

    const d = new Date()
    d.setDate(d.getDate())
    d.setHours(0, 0, 0, 0)

    const currentDate = ref<Date>(d)

    const normalizeGame = (g: any): RecentGame => {
        const homeAbbr = TEAM_ID_TO_ABBR[g.HOME_TEAM_ID] || 'UNK'
        const awayAbbr = TEAM_ID_TO_ABBR[g.VISITOR_TEAM_ID] || 'UNK'

        return {
            Game_ID: g.GAME_ID,
            datetime: getGameDateTime(g),
            gameDay: getGameDay(g),

            status: g.GAME_STATUS ?? '',
            statusTime: formatMSKTime(getGameDateTime(g)) || convertETToMSKTime(g.GAME_STATUS ?? '') || g.GAME_STATUS || '',

            home: {
                id: g.HOME_TEAM_ID,
                abbr: homeAbbr,
                name: teamsFullNames[homeAbbr] || homeAbbr,
                score: g.HOME_TEAM_SCORE ?? null
            },

            away: {
                id: g.VISITOR_TEAM_ID,
                abbr: awayAbbr,
                name: teamsFullNames[awayAbbr] || awayAbbr,
                score: g.VISITOR_TEAM_SCORE ?? null
            }
        }
    }

    const loadGames = async (date: Date) => {
        const requestId = ++loadRequestId
        isLoading.value = !hasCachedGames(date)

        try {
            const targetDay = getDateKey(date)
            const games = await loadGamesForDate(date)
            const all = games.map(normalizeGame)

            if (requestId !== loadRequestId) return

            gamesList.value = all.filter(g => g.gameDay === targetDay)
            prefetchAdjacentDays(date)

            error.value = null
        } catch {
            if (requestId !== loadRequestId) return

            error.value = 'Не удалось загрузить игры'
            gamesList.value = []
        } finally {
            if (requestId === loadRequestId) {
                isLoading.value = false
            }
        }
    }

    const prevDay = () => {
        const d = new Date(currentDate.value)
        d.setDate(d.getDate() - 1)
        d.setHours(0, 0, 0, 0)
        currentDate.value = d
    }

    const nextDay = () => {
        const d = new Date(currentDate.value)
        d.setDate(d.getDate() + 1)
        d.setHours(0, 0, 0, 0)
        currentDate.value = d
    }

    const selectDate = (date: Date | null) => {
        if (!date) return
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        currentDate.value = d
    }

    watch(currentDate, (d) => {
        if (!d) return
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => loadGames(d), 80)
    })

    onMounted(() => loadGames(currentDate.value))

    const formatGameTime = (dateStr: string): string => {
        return formatMSKTime(dateStr)
    }

    return {
        gamesList,
        hideScores,
        collapsed,
        currentDate,
        error,
        isLoading,
        prevDay,
        nextDay,
        selectDate,
        formatGameTime,
        convertETToMSKTime
    }
}