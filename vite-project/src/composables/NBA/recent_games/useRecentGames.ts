import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../../../stores/auth'

import { getDateKey, delay } from '../utils'
import { TEAM_ID_MAP } from '../../../constants/nbaTeams'
import { teamsFullNames } from '../../../constants/TeamFullName'

const TEAM_ID_TO_ABBR: Record<number, string> = Object.fromEntries(
    Object.entries(TEAM_ID_MAP).map(([abbr, id]) => [id, abbr])
)

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

type DailyGameDTO = {
    GAME_ID: string
    GAME_DATE_EST: string
    HOME_TEAM_ID: number
    VISITOR_TEAM_ID: number
    HOME_TEAM_SCORE?: number
    VISITOR_TEAM_SCORE?: number
    GAME_STATUS?: string
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
    try {
        const res = await fetch(`${API_BASE}/api/games/by-date/${dateStr}`)
        const data = await res.json()
        if (!res.ok) throw new Error('HTTP error')
        return Array.isArray(data) ? data : []
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

    const d = new Date()
    d.setDate(d.getDate())
    d.setHours(0, 0, 0, 0)

    const currentDate = ref<Date>(d)

    const normalizeGame = (g: any): RecentGame => {
        const homeAbbr = TEAM_ID_TO_ABBR[g.HOME_TEAM_ID] || 'UNK'
        const awayAbbr = TEAM_ID_TO_ABBR[g.VISITOR_TEAM_ID] || 'UNK'

        return {
            Game_ID: g.GAME_ID,
            datetime: g.GAME_DATE_EST,
            gameDay: getDayFromString(g.GAME_DATE_EST),

            status: g.GAME_STATUS ?? '',
            statusTime: convertETToMSKTime(g.GAME_STATUS ?? ''),

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
        if (isLoading.value) return
        isLoading.value = true

        try {
            const prev = new Date(date.getTime() - 86400000)
            const next = new Date(date.getTime() + 86400000)

            const days = [prev, date, next]

            let all: RecentGame[] = []

            for (const d of days) {
                const games = await getGamesByDate(getDateKey(d))
                all.push(...games.map(normalizeGame))
                await delay(100)
            }

            const targetDay = getDayFromString(date.toISOString())

            gamesList.value = all.filter(g => g.gameDay === targetDay)

            error.value = null
        } catch {
            error.value = 'Не удалось загрузить игры'
            gamesList.value = []
        } finally {
            isLoading.value = false
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
        timeout = setTimeout(() => loadGames(d), 250)
    })

    onMounted(() => loadGames(currentDate.value))

    const formatGameTime = (dateStr: string): string => {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return ''

        const msk = new Date(d.getTime() + 7 * 60 * 60 * 1000)

        return msk.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
    }

    return {
        gamesList,
        hideScores,
        collapsed,
        currentDate,
        error,
        prevDay,
        nextDay,
        selectDate,
        formatGameTime,
        convertETToMSKTime
    }
}