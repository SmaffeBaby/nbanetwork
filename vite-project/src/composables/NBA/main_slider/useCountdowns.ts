import { ref, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import type { Game } from './useDailyGames'

dayjs.extend(duration)

export function useCountdowns(gamesList: Game[]) {
    const countdowns = ref<Record<number, string>>({})

    function updateCountdowns() {
        const now = dayjs()
        gamesList.forEach(game => {
            if (game.period === 0) {
                const gameTime = dayjs(game.datetime)
                if (gameTime.isAfter(now)) {
                    const diff = dayjs.duration(gameTime.diff(now))
                    countdowns.value[game.id] = `${diff.hours()}ч ${diff.minutes()}м ${diff.seconds()}с`
                } else {
                    countdowns.value[game.id] = 'Началось!'
                }
            }
        })
    }

    let interval: number
    onMounted(() => {
        updateCountdowns()
        interval = window.setInterval(updateCountdowns, 1000)
    })

    onUnmounted(() => {
        clearInterval(interval)
    })

    return { countdowns }
}