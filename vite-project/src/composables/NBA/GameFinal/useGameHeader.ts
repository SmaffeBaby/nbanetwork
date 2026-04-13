import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useScoreVisibility } from '../../../stores/useScoreVisibility'

export function useGameHeader(gameRef: any) {
    const router = useRouter()
    const store = useScoreVisibility()

    const gameId = computed(() => {
        const g = gameRef?.value
        if (!g?.gameId) return null
        return String(g.gameId)
    })

    const isVisible = computed(() => {
        const id = gameId.value
        if (!id) return false
        return store.isVisible(id)
    })

    const isLive = computed(() =>
        gameRef?.value?.status?.toLowerCase?.() === 'live'
    )

    function toggleScore() {
        const id = gameId.value
        if (!id) return
        store.toggle(id)
    }

    function goTeam(abbr: string) {
        if (!abbr) return
        router.push(`/team/${abbr}`)
    }

    return {
        gameId,
        isVisible,
        isLive,
        toggleScore,
        goTeam
    }
}