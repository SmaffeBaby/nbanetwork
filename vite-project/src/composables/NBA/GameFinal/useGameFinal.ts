import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

export function useGameFinal() {
    const route = useRoute()
    const gameId = route.params.gameId as string

    const game = ref<any>(null)
    const recap = ref<any>(null)

    const loading = ref(true)
    const error = ref<string | null>(null)

    const fetchGame = async () => {
        try {
            const res = await fetch(`/api/game-recap/${gameId}`)

            if (!res.ok) {
                throw new Error('Failed to load game recap')
            }

            const data = await res.json()

            recap.value = data

            // 🔥 достаём meta из recap (у тебя там уже есть всё)
            const meta = data?.meta || {}

            // ❗ ВАЖНО: тебе нужно вернуть score из fetchGameRecap
            // (ниже покажу правку)

            game.value = {
                gameId,
                status: 'Final',

                dateUTC: null,
                dateMSK: null,

                home: {
                    name: meta?.homeTeam || '',
                    abbr: meta?.homeAbbr || '',
                    score: meta?.homeScore ?? null
                },

                away: {
                    name: meta?.awayTeam || '',
                    abbr: meta?.awayAbbr || '',
                    score: meta?.awayScore ?? null
                }
            }

        } catch (e: any) {
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    onMounted(fetchGame)

    return {
        gameId,
        game,
        recap,
        loading,
        error,
        fetchGame
    }
}