import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useScoreVisibility } from '../../../stores/useScoreVisibility'

export function useGameHeader(gameRef: any) {
    const router = useRouter()
    const store = useScoreVisibility()

    onMounted(() => {
        store.load()
    })

    const gameId = computed(() => gameRef?.value?.id || gameRef?.value?.dateMSK)

    const isVisible = computed(() =>
        store.isVisible(gameId.value)
    )

    const isLive = computed(() =>
        gameRef?.value?.status?.toLowerCase().includes('live')
    )

    function toggleScore() {
        store.toggle(gameId.value)
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