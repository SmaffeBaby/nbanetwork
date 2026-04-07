import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'

export type SortDir = 'asc' | 'desc'

type NumericKeys<T> = {
    [K in keyof T]: T[K] extends number ? K : never
}[keyof T]

export function useSorting<T, K extends NumericKeys<T>>(
    items: T[] | Ref<T[]> | ComputedRef<T[]>,
    defaultKey: K
) {
    const sortKey = ref<K>(defaultKey)
    const sortDir = ref<SortDir>('desc')

    const toggleSort = (key: K) => {
        if (sortKey.value === key) {
            sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
        } else {
            sortKey.value = key
            sortDir.value = 'desc'
        }
    }

    const sortedItems = computed(() => {
        const arr: T[] = 'value' in items ? items.value : items
        return [...arr].sort((a, b) => {
            const aVal = a[sortKey.value as K] as number
            const bVal = b[sortKey.value as K] as number
            return sortDir.value === 'desc' ? bVal - aVal : aVal - bVal
        })
    })

    const sortArrow = (key: K) => {
        if (sortKey.value !== key) return ''
        return sortDir.value === 'desc' ? '↓' : '↑'
    }

    return { sortKey, sortDir, toggleSort, sortedItems, sortArrow }
}