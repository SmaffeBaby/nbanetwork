import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../../../stores/auth'
import {
    formatDateTitle,
    getTodayDateKey,
    isValidDateKey,
    shiftDateKey,
    useGamesByDate
} from './useGamesByDate'

export function useGamesByDatePage() {
    const route = useRoute()
    const router = useRouter()
    const authStore = useAuthStore()
    const { user } = storeToRefs(authStore)

    const {
        games,
        counts,
        hasGames,
        isLoading,
        error,
        loadDate,
        loadCounts
    } = useGamesByDate()

    const selectedDate = computed(() => {
        const date = String(route.params.date ?? '')
        return isValidDateKey(date) ? date : getTodayDateKey()
    })

    const hideScoresModel = computed({
        get: () => user.value?.hideScores ?? true,
        set: (value: boolean) => {
            authStore.updateHideScores(value)
        }
    })

    const pageTitle = computed(() => {
        return selectedDate.value === getTodayDateKey()
            ? 'Игры сегодня'
            : `Игры за ${formatDateTitle(selectedDate.value)}`
    })

    const gamesCountLabel = computed(() => {
        const count = games.value.length
        if (count === 0) return 'Нет игр'
        if (count === 1) return '1 игра'

        return `${count} игр`
    })

    const selectDate = (dateKey: string) => {
        if (dateKey === selectedDate.value) return
        router.push({ name: 'GamesByDate', params: { date: dateKey } })
    }

    const goToPreviousDay = () => selectDate(shiftDateKey(selectedDate.value, -1))

    const goToNextDay = () => selectDate(shiftDateKey(selectedDate.value, 1))

    const goToToday = () => selectDate(getTodayDateKey())

    const goToGame = (gameId: string) => {
        router.push(`/game/${gameId}`)
    }

    const displayScore = (score: number | null) => {
        if (score === null) return '-'
        return hideScoresModel.value ? '--' : score
    }

    watch(
        selectedDate,
        (dateKey) => {
            if (!isValidDateKey(String(route.params.date ?? ''))) {
                router.replace({ name: 'GamesByDate', params: { date: dateKey } })
                return
            }

            loadDate(dateKey)
            loadCounts(Array.from({ length: 7 }, (_, index) => shiftDateKey(dateKey, index - 3)))
        },
        { immediate: true }
    )

    return {
        games,
        counts,
        hasGames,
        isLoading,
        error,
        selectedDate,
        hideScoresModel,
        pageTitle,
        gamesCountLabel,
        loadCounts,
        selectDate,
        goToPreviousDay,
        goToNextDay,
        goToToday,
        goToGame,
        displayScore
    }
}
