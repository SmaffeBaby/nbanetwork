import { ref, onMounted, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'

type Filters = {
    search: string
    quarter: number | null
}

export function useGameFinal(filters: Ref<Filters>) {
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
            const quarter = filters.value?.quarter

            const url = quarter
                ? `/api/game-recap/${gameId}?quarter=${quarter}`
                : `/api/game-recap/${gameId}`

            const res = await fetch(url)

            if (!res.ok) {
                throw new Error('Failed to load game recap')
            }

            const data = await res.json()

            const meta = data?.meta || {}

            const players = data?.players || []

            recap.value = {
                ...data,
                mvp: enrichMvp(data?.mvp || data?.recap?.mvp, players)
            }

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

    watch(
        () => filters.value?.quarter,
        () => fetchGame()
    )

    return {
        gameId,
        game,
        recap,
        loading,
        error,
        fetchGame
    }
}