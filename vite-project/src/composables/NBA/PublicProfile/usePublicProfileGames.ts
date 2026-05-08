import { computed, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { FavoriteGame } from '../../../stores/auth'

const toDateInputValue = (date: string | null | undefined) => {
    if (!date) return ''

    const trimmedDate = date.trim()

    const europeanDotDateMatch = trimmedDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
    if (europeanDotDateMatch) {
        const [, day, month, year] = europeanDotDateMatch
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    const europeanSlashDateMatch = trimmedDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (europeanSlashDateMatch) {
        const [, day, month, year] = europeanSlashDateMatch
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    const isoDateMatch = trimmedDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (isoDateMatch) {
        const [, year, month, day] = isoDateMatch
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    return ''
}
export const usePublicProfileGames = (
    games: Ref<FavoriteGame[]>,
    pageSize = 5
) => {
    const page = ref(1)
    const selectedDate = ref('')
    const hiddenScores = ref<string[]>([])

    const availableDates = computed(() =>
        Array.from(
            new Set(
                games.value
                    .map(game => toDateInputValue(game.date))
                    .filter((date): date is string => Boolean(date))
            )
        ).sort()
    )

    const minDate = computed(() => availableDates.value[0] ?? '')
    const maxDate = computed(() => availableDates.value.at(-1) ?? '')

    const filteredGames = computed(() => {
        if (!selectedDate.value) return games.value

        return games.value.filter(game =>
            toDateInputValue(game.date) === selectedDate.value
        )
    })

    const totalPages = computed(() =>
        Math.max(1, Math.ceil(filteredGames.value.length / pageSize))
    )

    const visibleGames = computed(() =>
        filteredGames.value.slice((page.value - 1) * pageSize, page.value * pageSize)
    )

    const isHidden = (gameId: string) => hiddenScores.value.includes(gameId)

    const setSelectedDate = (date: string) => {
        if (!date) {
            selectedDate.value = ''
            page.value = 1
            return
        }

        if (!availableDates.value.includes(date)) return

        selectedDate.value = date
        page.value = 1
    }

    const resetSelectedDate = () => {
        selectedDate.value = ''
        page.value = 1
    }

    const toggleScore = (gameId: string) => {
        hiddenScores.value = isHidden(gameId)
            ? hiddenScores.value.filter(id => id !== gameId)
            : [...hiddenScores.value, gameId]
    }

    const score = (game: FavoriteGame, side: 'away' | 'home') => {
        if (isHidden(game.id)) return '-'
        return side === 'away' ? game.awayScore ?? '-' : game.homeScore ?? '-'
    }

    const previousPage = () => {
        page.value = Math.max(1, page.value - 1)
    }

    const nextPage = () => {
        page.value = Math.min(totalPages.value, page.value + 1)
    }

    watch(
        () => games.value.map(game => game.id).join('|'),
        () => {
            if (page.value > totalPages.value) {
                page.value = totalPages.value
            }

            hiddenScores.value = games.value.map(game => game.id)

            if (selectedDate.value && !availableDates.value.includes(selectedDate.value)) {
                selectedDate.value = ''
            }
        },
        { immediate: true }
    )

    return {
        page,
        pageSize,
        selectedDate,
        availableDates,
        minDate,
        maxDate,
        filteredGames,
        visibleGames,
        totalPages,
        isHidden,
        setSelectedDate,
        resetSelectedDate,
        toggleScore,
        score,
        previousPage,
        nextPage
    }
}