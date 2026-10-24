import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../../../stores/auth'
import { getDateKey } from '../utils'
import { dateKeyToDate, getTodayDateKey, useGamesByDate } from '../games/useGamesByDate'

export function useRecentGames() {
    const authStore = useAuthStore()
    const { user } = storeToRefs(authStore)
    const { games, error, isLoading, loadDate } = useGamesByDate()
    const currentDate = ref(dateKeyToDate(getTodayDateKey()))
    const collapsed = ref(false)
    const hideScores = computed({
        get: () => user.value?.hideScores ?? true,
        set: (value: boolean) => { authStore.updateHideScores(value) }
    })
    const shiftDay = (offset: number) => {
        const date = new Date(currentDate.value)
        date.setDate(date.getDate() + offset)
        currentDate.value = date
    }
    const selectDate = (date: Date | null) => {
        if (date && !Number.isNaN(date.getTime())) currentDate.value = date
    }
    watch(currentDate, date => loadDate(getDateKey(date)), { immediate: true })
    let timer: ReturnType<typeof setInterval> | undefined
    onMounted(() => { timer = setInterval(() => {
        if (getDateKey(currentDate.value) >= getTodayDateKey()) loadDate(getDateKey(currentDate.value))
    }, 60000) })
    onUnmounted(() => clearInterval(timer))
    return {
        gamesList: computed(() => games.value.map(game => ({ ...game, Game_ID: game.id }))),
        currentDate, collapsed, hideScores, error, isLoading,
        prevDay: () => shiftDay(-1), nextDay: () => shiftDay(1), selectDate,
        retry: () => loadDate(getDateKey(currentDate.value))
    }
}
