import { defineStore } from 'pinia'

function loadFromStorage(): Record<string, boolean> {
    if (typeof window === 'undefined') return {}

    const data = localStorage.getItem('scoreVisibility')
    if (!data) return {}

    try {
        return JSON.parse(data)
    } catch {
        return {}
    }
}

export const useScoreVisibility = defineStore('scoreVisibility', {
    state: () => ({
        visibleGames: loadFromStorage()
    }),

    actions: {
        toggle(gameId: string) {
            if (!gameId) return

            this.visibleGames = {
                ...this.visibleGames,
                [gameId]: !this.visibleGames[gameId]
            }

            localStorage.setItem(
                'scoreVisibility',
                JSON.stringify(this.visibleGames)
            )
        },

        isVisible(gameId: string) {
            return !!this.visibleGames[gameId]
        }
    }
})