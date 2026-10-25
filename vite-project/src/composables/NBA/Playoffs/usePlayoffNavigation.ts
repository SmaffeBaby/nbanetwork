import { openGame } from '../../../api/gameNavigation'
import { useRouter } from 'vue-router'

export function usePlayoffNavigation() {
    const router = useRouter()

    function goToTeam(abbr: string) {
        if (!abbr) return
        router.push(`/team/${abbr}`)
    }

    function goToGame(gameId: any) {
        if (!gameId) return
        return openGame(router, gameId)
    }

    return {
        goToTeam,
        goToGame
    }
}
