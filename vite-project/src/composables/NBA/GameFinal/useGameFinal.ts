import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

export function useGameFinal() {
    const route = useRoute()
    const gameId = route.params.gameId as string

    const game = ref<any>(null)
    const loading = ref(true)
    const error = ref<string | null>(null)

    const fetchGame = async () => {
        try {
            const res = await fetch(`/api/game-detail/${gameId}`)

            if (!res.ok) {
                throw new Error('Failed to load game detail')
            }

            game.value = await res.json()
        } catch (e: any) {
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    onMounted(() => {
        fetchGame()
    })

    return {
        gameId,
        game,
        loading,
        error,
        fetchGame
    }
}