import { ref, computed } from 'vue'

export function useCurrentSeason() {
    const currentSeason = ref<string>('')
    const season = ref('')

    async function fetchCurrentSeason() {
        const res = await fetch('/api/current-season')
        const data = await res.json()
        currentSeason.value = data.season

        season.value = currentSeason.value
    }

    const seasons = computed(() => {
        if (!currentSeason.value) return []

        const [startYear] = currentSeason.value.split('-').map(Number)

        return Array.from({ length: 4 }, (_, i) => {
            const start = startYear - i
            const end = (start + 1).toString().slice(-2)
            return `${start}-${end}`
        })
    })

    return {
        currentSeason,
        season,
        seasons,
        fetchCurrentSeason,
    }
}