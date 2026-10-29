import { computed, ref } from 'vue'
import { useAuthStore } from '../../../stores/auth'
import { useScoreVisibility } from '../../../stores/useScoreVisibility'

export function usePlayoffSpoilers() {
    const authStore = useAuthStore()
    const scoreVisibility = useScoreVisibility()
    const localHideSpoilers = ref(true)

    const hideSpoilers = computed(() => {
        return authStore.loading || (authStore.user?.hideScores ?? localHideSpoilers.value)
    })

    function isGameVisible(gameId: string) {
        return !authStore.loading && scoreVisibility.isVisible(gameId, !hideSpoilers.value)
    }

    function displayScore(gameId: string, score: number) {
        return isGameVisible(gameId) ? score : '--'
    }

    function toggleGameVisibility(gameId: string) {
        scoreVisibility.toggle(gameId, !hideSpoilers.value)
    }

    async function toggleSpoilers() {
        const next = !hideSpoilers.value

        if (authStore.user) {
            await authStore.updateHideScores(next)
            return
        }

        localHideSpoilers.value = next
    }

    return {
        hideSpoilers,
        isGameVisible,
        displayScore,
        toggleGameVisibility,
        toggleSpoilers
    }
}
