import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

export function useGameFinal() {
    const route = useRoute()
    const gameId = route.params.gameId as string

    const game = ref<any>(null)
    const recap = ref<any>(null)

    const loading = ref(true)
    const error = ref<string | null>(null)

    const enrichMvp = (mvp: any, players: any[] = []) => {
        if (!mvp) return null

        if (mvp.PLAYER_ID) return mvp

        const name = (mvp.name || '').toLowerCase()

        const player = players.find(p =>
            (p.fullName || '').toLowerCase() === name
        )

        return {
            ...mvp,
            PLAYER_ID: player?.playerId || null,
            TEAM_ID: player?.teamId || null
        }
    }

    const fetchGame = async () => {
        try {
            const res = await fetch(`/api/game-recap/${gameId}`)

            if (!res.ok) {
                throw new Error('Failed to load game recap')
            }

            const data = await res.json()

            const meta = data?.meta || {}

            const players =
                data?.players ||
                data?.roster ||
                []

            const normalizedRecap = {
                ...data,
                mvp: enrichMvp(data?.mvp || data?.recap?.mvp, players)
            }

            recap.value = normalizedRecap

            game.value = {
                gameId,
                status: 'Final',

                dateUTC: data?.dateUTC,
                dateMSK: data?.dateMSK,

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
            error.value = e?.message || 'Unknown error'
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