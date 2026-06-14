import { ref, onMounted, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'

type Filters = {
    search: string
    period: string | number | null
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

    const buildGameFromDetail = (detail: any) => {
        if (!detail?.gameId) return null

        return {
            gameId: detail.gameId,
            status: detail.status || 'TBD',

            dateUTC: detail.dateUTC,
            dateMSK: detail.dateMSK,

            home: {
                name: detail.home?.name || '',
                abbr: detail.home?.abbr || '',
                score: detail.home?.score ?? null
            },

            away: {
                name: detail.away?.name || '',
                abbr: detail.away?.abbr || '',
                score: detail.away?.score ?? null
            }
        }
    }

    const fetchGameDetailFallback = async () => {
        const res = await fetch(`/api/game-detail/${gameId}`)

        if (!res.ok) {
            throw new Error('Failed to load game detail')
        }

        return buildGameFromDetail(await res.json())
    }

    const fetchGame = async () => {
        try {
            const period = filters.value?.period

            const url = period
                ? `/api/game-recap/${gameId}?period=${period}`
                : `/api/game-recap/${gameId}`

            const res = await fetch(url)

            if (!res.ok) {
                throw new Error('Failed to load game recap')
            }

            const data = await res.json()
            const meta = data?.meta || {}

            if (!data || (!meta.homeAbbr && !meta.awayAbbr)) {
                const fallbackGame = await fetchGameDetailFallback()

                if (!fallbackGame) {
                    throw new Error('Failed to load game data')
                }

                game.value = fallbackGame
                recap.value = null
                error.value = null
                return
            }

            const players = data?.players || []

            recap.value = {
                ...data,
                mvp: enrichMvp(data?.mvp || data?.recap?.mvp, players)
            }

            game.value = {
                gameId,
                status: meta?.status || 'Final',

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
        () => filters.value?.period,
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
