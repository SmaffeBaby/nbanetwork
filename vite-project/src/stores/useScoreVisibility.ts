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
        toggle(gameId: string, defaultVisible = false) {
            if (!gameId) return

            this.visibleGames = {
                ...this.visibleGames,
                [gameId]: !this.isVisible(gameId, defaultVisible)
            }

            localStorage.setItem(
                'scoreVisibility',
                JSON.stringify(this.visibleGames)
            )
        },

        isVisible(gameId: string, defaultVisible = false): boolean {
            return this.visibleGames[gameId] ?? defaultVisible
        },

        reset() {
            this.visibleGames = {}
            localStorage.setItem('scoreVisibility', '{}')
        }
    }
})