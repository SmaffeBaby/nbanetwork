import { defineStore } from 'pinia'

export const useScoreVisibility = defineStore('scoreVisibility', {
    state: () => ({
        visibleGames: {} as Record<string, boolean>
    }),

    actions: {
        toggle(gameId: string) {
            this.visibleGames[gameId] = !this.visibleGames[gameId]
            this.save()
        },

        isVisible(gameId: string) {
            return !!this.visibleGames[gameId]
        },

        save() {
            localStorage.setItem('scoreVisibility', JSON.stringify(this.visibleGames))
        },

        load() {
            const data = localStorage.getItem('scoreVisibility')
            if (data) {
                this.visibleGames = JSON.parse(data)
            }
        }
    }
})