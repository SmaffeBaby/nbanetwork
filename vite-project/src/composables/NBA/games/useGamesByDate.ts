import { computed, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { getDateKey, toMSK } from '../utils'
import { TEAM_ID_MAP } from '../../../constants/nbaTeams'
import { teamsFullNames } from '../../../constants/TeamFullName'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

const TEAM_ID_TO_ABBR: Record<number, string> = Object.fromEntries(
    Object.entries(TEAM_ID_MAP).map(([abbr, id]) => [id, abbr])
)

export type DailyGameDTO = {
    GAME_ID: string
    GAME_DATE_EST: string
    GAME_DATE_MSK?: string
    GAME_TIME_UTC?: string
    HOME_TEAM_ID: number
    VISITOR_TEAM_ID: number
    HOME_TEAM_ABBREVIATION?: string
    VISITOR_TEAM_ABBREVIATION?: string
    HOME_TEAM_SCORE?: number
    VISITOR_TEAM_SCORE?: number
    GAME_STATUS?: string
}

export type GamesPageGame = {
    id: string
    datetime: string
    gameDay: string
    status: string
    statusTime: string
    home: { id: number; abbr: string; name: string; score: number | null }
    away: { id: number; abbr: string; name: string; score: number | null }
}

export type DateGameCount = {
    dateKey: string
    count: number
    isLoading: boolean
}

export const getTodayDateKey = () => getDateKey(toMSK(new Date()))

export const dateKeyToDate = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number)
    return new Date(year, month - 1, day)
}

export const isValidDateKey = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

    return getDateKey(dateKeyToDate(value)) === value
}

export const shiftDateKey = (dateKey: string, days: number) => {
    const date = dateKeyToDate(dateKey)
    date.setDate(date.getDate() + days)
    return getDateKey(date)
}

export const formatDateTitle = (dateKey: string) => {
    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        weekday: 'long'
    }).format(dateKeyToDate(dateKey))
}

export const formatShortDate = (dateKey: string) => {
    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit'
    }).format(dateKeyToDate(dateKey))
}

export const formatWeekday = (dateKey: string) => {
    return new Intl.DateTimeFormat('ru-RU', {
        weekday: 'short'
    }).format(dateKeyToDate(dateKey))
}

const getGameDay = (game: DailyGameDTO) => {
    return game.GAME_DATE_MSK || game.GAME_DATE_EST?.slice(0, 10) || ''
}

const formatMSKTime = (dateStr: string) => {
    const date = new Date(dateStr)
    if (!dateStr || isNaN(date.getTime())) return ''

    return new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Europe/Moscow',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date)
}

const convertETToMSKTime = (status: string) => {
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

const getGameDateTime = (game: DailyGameDTO) => game.GAME_TIME_UTC || ''

const getDateDiffFromToday = (dateKey: string) => {
    const date = dateKeyToDate(dateKey)
    const today = dateKeyToDate(getTodayDateKey())

    return Math.round((date.getTime() - today.getTime()) / 86400000)
}

const getQueryStaleTime = (dateKey: string) => {
    const dayDiff = getDateDiffFromToday(dateKey)

    if (dayDiff >= -1 && dayDiff <= 0) return 60 * 1000
    if (dayDiff > 0) return 10 * 60 * 1000

    return 24 * 60 * 60 * 1000
}

const normalizeGame = (game: DailyGameDTO): GamesPageGame => {
    const homeAbbr = game.HOME_TEAM_ABBREVIATION || TEAM_ID_TO_ABBR[game.HOME_TEAM_ID] || 'UNK'
    const awayAbbr = game.VISITOR_TEAM_ABBREVIATION || TEAM_ID_TO_ABBR[game.VISITOR_TEAM_ID] || 'UNK'
    const status = game.GAME_STATUS ?? ''
    const datetime = getGameDateTime(game)

    return {
        id: game.GAME_ID,
        datetime,
        gameDay: getGameDay(game),
        status,
        statusTime: formatMSKTime(datetime) || convertETToMSKTime(status) || status,
        home: {
            id: game.HOME_TEAM_ID,
            abbr: homeAbbr,
            name: teamsFullNames[homeAbbr] || homeAbbr,
            score: game.HOME_TEAM_SCORE ?? null
        },
        away: {
            id: game.VISITOR_TEAM_ID,
            abbr: awayAbbr,
            name: teamsFullNames[awayAbbr] || awayAbbr,
            score: game.VISITOR_TEAM_SCORE ?? null
        }
    }
}

const fetchGamesByDate = async (dateKey: string): Promise<DailyGameDTO[]> => {
    const response = await fetch(`${API_BASE}/api/games/by-date/${dateKey}`)
    const data = await response.json()
    if (!response.ok) throw new Error('Не удалось загрузить игры')

    return Array.isArray(data) ? data : []
}

const getGamesByDate = (
    dateKey: string,
    queryClient: ReturnType<typeof useQueryClient>
): Promise<DailyGameDTO[]> => {
    return queryClient.fetchQuery({
        queryKey: ['games-by-date', dateKey],
        queryFn: () => fetchGamesByDate(dateKey),
        staleTime: getQueryStaleTime(dateKey),
        gcTime: 6 * 60 * 60 * 1000
    })
}

export function useGamesByDate() {
    const queryClient = useQueryClient()
    const games = ref<GamesPageGame[]>([])
    const counts = ref<Record<string, DateGameCount>>({})
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    let loadRequestId = 0

    const hasGames = computed(() => games.value.length > 0)

    const loadDate = async (dateKey: string) => {
        const requestId = ++loadRequestId
        isLoading.value = true

        try {
            const rawGames = await getGamesByDate(dateKey, queryClient)
            if (requestId !== loadRequestId) return

            const normalized = rawGames.map(normalizeGame).filter(game => game.gameDay === dateKey)
            games.value = normalized
            counts.value = {
                ...counts.value,
                [dateKey]: {
                    dateKey,
                    count: normalized.length,
                    isLoading: false
                }
            }
            error.value = null
        } catch {
            if (requestId !== loadRequestId) return

            games.value = []
            error.value = 'Не удалось загрузить игры'
        } finally {
            if (requestId === loadRequestId) {
                isLoading.value = false
            }
        }
    }

    const loadCounts = async (dateKeys: string[]) => {
        const missingDates = dateKeys.filter(dateKey => !counts.value[dateKey])
        if (!missingDates.length) return

        counts.value = {
            ...counts.value,
            ...Object.fromEntries(
                missingDates.map(dateKey => [
                    dateKey,
                    { dateKey, count: 0, isLoading: true }
                ])
            )
        }

        const loadedCounts = await Promise.all(
            missingDates.map(async (dateKey) => {
                try {
                    const rawGames = await getGamesByDate(dateKey, queryClient)
                    return {
                        dateKey,
                        count: rawGames.filter(game => getGameDay(game) === dateKey).length,
                        isLoading: false
                    }
                } catch {
                    return {
                        dateKey,
                        count: 0,
                        isLoading: false
                    }
                }
            })
        )

        counts.value = {
            ...counts.value,
            ...Object.fromEntries(loadedCounts.map(item => [item.dateKey, item]))
        }
    }

    return {
        games,
        counts,
        hasGames,
        isLoading,
        error,
        loadDate,
        loadCounts
    }
}
