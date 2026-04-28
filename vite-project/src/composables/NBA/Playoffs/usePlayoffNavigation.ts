import { useRouter } from 'vue-router'

export function usePlayoffNavigation() {
    const router = useRouter()

    function goToTeam(abbr: string) {
        if (!abbr) return
        router.push(`/team/${abbr}`)
    }

    function goToGame(gameId: string) {
        if (!gameId) return
        router.push(`/game/${gameId}`)
    }

    return {
        goToTeam,
        goToGame
    }
}
