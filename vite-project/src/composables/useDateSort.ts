import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

export type DateSortOrder = 'desc' | 'asc'

type DateSortSource<T> = Ref<T[]> | ComputedRef<T[]>

export const parseSortableDate = (value: string | null | undefined) => {
    if (!value) return null

    const trimmed = value.trim()
    if (!trimmed || trimmed.startsWith('1900-01-01')) return null

    const europeanDateMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:,\s*|\s+)?(\d{1,2})?:?(\d{2})?/)
    if (europeanDateMatch) {
        const [, day, month, year, hours = '0', minutes = '0'] = europeanDateMatch
        const date = new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hours),
            Number(minutes)
        )

        return Number.isNaN(date.getTime()) ? null : date.getTime()
    }

    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
}

export function useDateSort<T>(
    items: DateSortSource<T>,
    getDate: (item: T) => string | null | undefined,
    initialOrder: DateSortOrder = 'desc'
) {
    const dateSortOrder = ref<DateSortOrder>(initialOrder)

    const sortedByDate = computed(() => {
        return [...items.value].sort((a, b) => {
            const firstDate = parseSortableDate(getDate(a))
            const secondDate = parseSortableDate(getDate(b))

            if (firstDate === null && secondDate === null) return 0
            if (firstDate === null) return 1
            if (secondDate === null) return -1

            return dateSortOrder.value === 'desc'
                ? secondDate - firstDate
                : firstDate - secondDate
        })
    })

    const setDateSortOrder = (order: DateSortOrder) => {
        dateSortOrder.value = order
    }

    return {
        dateSortOrder,
        sortedByDate,
        setDateSortOrder
    }
}
