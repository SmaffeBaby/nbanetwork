import { computed, ref, watch } from 'vue'
import {
    dateKeyToDate,
    formatDateTitle,
    formatShortDate,
    formatWeekday,
    shiftDateKey,
    type DateGameCount
} from './useGamesByDate'

type GamesDatePickerProps = {
    modelValue: string
    counts: Record<string, DateGameCount>
}

type GamesDatePickerEmit = {
    (event: 'select', dateKey: string): void
    (event: 'visibleChange', dateKeys: string[]): void
}

const monthWeekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const formatDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

export function useGamesDatePicker(
    props: GamesDatePickerProps,
    emit: GamesDatePickerEmit
) {
    const isMonthCalendarOpen = ref(false)
    const monthDate = ref(dateKeyToDate(props.modelValue))

    const visibleDays = computed(() => {
        return Array.from({ length: 7 }, (_, index) => shiftDateKey(props.modelValue, index - 3))
    })

    const monthTitle = computed(() => {
        return new Intl.DateTimeFormat('ru-RU', {
            month: 'long',
            year: 'numeric'
        }).format(monthDate.value)
    })

    const monthDays = computed(() => {
        const year = monthDate.value.getFullYear()
        const month = monthDate.value.getMonth()
        const firstDayOfMonth = new Date(year, month, 1)
        const mondayOffset = (firstDayOfMonth.getDay() + 6) % 7
        const firstCalendarDay = new Date(firstDayOfMonth)
        firstCalendarDay.setDate(firstDayOfMonth.getDate() - mondayOffset)

        return Array.from({ length: 42 }, (_, index) => {
            const date = new Date(firstCalendarDay)
            date.setDate(firstCalendarDay.getDate() + index)

            return {
                dateKey: formatDateKey(date),
                day: date.getDate(),
                isCurrentMonth: date.getMonth() === month
            }
        })
    })

    const getCount = (dateKey: string) => props.counts[dateKey]?.count ?? 0

    const getCountLabel = (dateKey: string) => {
        const countInfo = props.counts[dateKey]
        if (countInfo?.isLoading) return '...'

        const count = countInfo?.count ?? 0
        if (count === 0) return 'нет игр'
        if (count === 1) return '1 игра'

        return `${count} игр`
    }

    const syncMonthToSelected = () => {
        monthDate.value = dateKeyToDate(props.modelValue)
    }

    const openMonthCalendar = () => {
        syncMonthToSelected()
        isMonthCalendarOpen.value = true
    }

    const closeMonthCalendar = () => {
        isMonthCalendarOpen.value = false
    }

    const goToPreviousMonth = () => {
        monthDate.value = new Date(monthDate.value.getFullYear(), monthDate.value.getMonth() - 1, 1)
    }

    const goToNextMonth = () => {
        monthDate.value = new Date(monthDate.value.getFullYear(), monthDate.value.getMonth() + 1, 1)
    }

    const selectMonthDate = (dateKey: string) => {
        emit('select', dateKey)
        closeMonthCalendar()
    }

    watch(
        () => props.modelValue,
        () => {
            if (!isMonthCalendarOpen.value) syncMonthToSelected()
        }
    )

    watch(
        [isMonthCalendarOpen, monthDays],
        () => {
            if (!isMonthCalendarOpen.value) return
            emit('visibleChange', monthDays.value.map(day => day.dateKey))
        },
        { immediate: true }
    )

    return {
        formatDateTitle,
        formatShortDate,
        formatWeekday,
        visibleDays,
        isMonthCalendarOpen,
        monthWeekdays,
        monthTitle,
        monthDays,
        getCount,
        getCountLabel,
        syncMonthToSelected,
        openMonthCalendar,
        closeMonthCalendar,
        goToPreviousMonth,
        goToNextMonth,
        selectMonthDate
    }
}
