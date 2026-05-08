import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export type CalendarDay = {
    key: string
    day: number
    value: string
    isCurrentMonth: boolean
    isAvailable: boolean
    isSelected: boolean
}

type DatePickerProps = {
    modelValue: string
    availableDates: string[]
    minDate?: string
    maxDate?: string
    placeholder?: string
}

type DatePickerEmit = {
    (event: 'update:modelValue', value: string): void
    (event: 'change', value: string): void
}

export const useDatePicker = (
    props: DatePickerProps,
    emit: DatePickerEmit
) => {
    const rootRef = ref<HTMLElement | null>(null)
    const isOpen = ref(false)

    const today = new Date()
    const currentMonth = ref(today.getMonth())
    const currentYear = ref(today.getFullYear())

    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

    const availableDateSet = computed(() => new Set(props.availableDates))

    const formattedSelectedDate = computed(() => {
        if (!props.modelValue) return ''

        const [year, month, day] = props.modelValue.split('-')
        if (!year || !month || !day) return ''

        return `${day}.${month}.${year}`
    })

    const monthTitle = computed(() => {
        const date = new Date(currentYear.value, currentMonth.value)

        return new Intl.DateTimeFormat('ru-RU', {
            month: 'long',
            year: 'numeric'
        }).format(date)
    })

    const formatDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')

        return `${year}-${month}-${day}`
    }

    const isInsideRange = (value: string) => {
        if (props.minDate && value < props.minDate) return false
        if (props.maxDate && value > props.maxDate) return false

        return true
    }

    const calendarDays = computed<CalendarDay[]>(() => {
        const firstDayOfMonth = new Date(currentYear.value, currentMonth.value, 1)
        const firstCalendarDay = new Date(firstDayOfMonth)
        firstCalendarDay.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay())

        return Array.from({ length: 42 }, (_, index) => {
            const date = new Date(firstCalendarDay)
            date.setDate(firstCalendarDay.getDate() + index)

            const value = formatDate(date)

            return {
                key: value,
                day: date.getDate(),
                value,
                isCurrentMonth: date.getMonth() === currentMonth.value,
                isAvailable: availableDateSet.value.has(value) && isInsideRange(value),
                isSelected: props.modelValue === value
            }
        })
    })

    const getDayClass = (day: CalendarDay) => {
        if (day.isSelected) {
            return 'bg-blue-700 text-white font-semibold shadow-sm'
        }

        if (!day.isAvailable) {
            return 'cursor-not-allowed text-gray-300'
        }

        if (!day.isCurrentMonth) {
            return 'bg-green-400/70 text-white hover:bg-green-500'
        }

        return 'bg-green-500 text-white font-medium hover:bg-green-600'
    }

    const syncVisibleMonth = () => {
        const baseDate = props.modelValue || props.maxDate || props.availableDates[0]
        if (!baseDate) return

        const [year, month] = baseDate.split('-').map(Number)
        if (!year || !month) return

        currentYear.value = year
        currentMonth.value = month - 1
    }

    const toggleCalendar = () => {
        isOpen.value = !isOpen.value

        if (isOpen.value) {
            syncVisibleMonth()
        }
    }

    const selectDate = (day: CalendarDay) => {
        if (!day.isAvailable) return

        emit('update:modelValue', day.value)
        emit('change', day.value)
        isOpen.value = false
    }

    const previousMonth = () => {
        if (currentMonth.value === 0) {
            currentMonth.value = 11
            currentYear.value -= 1
            return
        }

        currentMonth.value -= 1
    }

    const nextMonth = () => {
        if (currentMonth.value === 11) {
            currentMonth.value = 0
            currentYear.value += 1
            return
        }

        currentMonth.value += 1
    }

    const handleClickOutside = (event: MouseEvent) => {
        if (!rootRef.value) return

        if (!rootRef.value.contains(event.target as Node)) {
            isOpen.value = false
        }
    }

    watch(
        () => props.modelValue,
        () => {
            syncVisibleMonth()
        },
        { immediate: true }
    )

    onMounted(() => {
        document.addEventListener('click', handleClickOutside)
    })

    onBeforeUnmount(() => {
        document.removeEventListener('click', handleClickOutside)
    })

    return {
        rootRef,
        isOpen,
        weekDays,
        formattedSelectedDate,
        monthTitle,
        calendarDays,
        getDayClass,
        toggleCalendar,
        selectDate,
        previousMonth,
        nextMonth
    }
}