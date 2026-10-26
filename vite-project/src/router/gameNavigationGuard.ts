import type { NavigationGuard } from 'vue-router'

type ResolveGame = (id: string, query: Record<string, any>) => Promise<string>

export function createGameNavigationGuard(resolveGame: ResolveGame): NavigationGuard {
    return async to => {
        if (to.name !== 'GameDetail' && to.name !== 'PreGame') return
        const original = String(to.params.gameId)
        try {
            const gameId = await resolveGame(original, to.query)
            // Preserve the caller's push/replace choice: canonicalization must not overwrite the source page.
            if (original !== gameId) return { name: to.name, params: { gameId }, hash: to.hash }
        } catch {
            // Leave failed legacy links visible so the detail API can report the error.
        }
    }
}
