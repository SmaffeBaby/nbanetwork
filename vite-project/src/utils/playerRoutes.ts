import type { Router } from 'vue-router'

export const goToPlayer = (router: Router, playerName: string) => {
    router.push(`/player/${encodeURIComponent(playerName)}`)
}