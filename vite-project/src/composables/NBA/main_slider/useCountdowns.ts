import { ref, onMounted, onUnmounted, toValue, type MaybeRefOrGetter } from 'vue'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import type { Game } from './useDailyGames'

dayjs.extend(duration)

export function useCountdowns(gamesList: MaybeRefOrGetter<Game[]>) {
    const countdowns = ref<Record<string, string>>({})

    function updateCountdowns() {
        const now = dayjs()
        countdowns.value = {}
        toValue(gamesList).forEach(game => {
            if (game.period === 0 && game.status !== 'Final' && game.datetime) {
                const gameTime = dayjs(game.datetime)
                if (gameTime.isAfter(now)) {
                    const diff = dayjs.duration(gameTime.diff(now))
                    countdowns.value[game.id] = `${Math.floor(diff.asDays()) > 0 ? `${Math.floor(diff.asDays())}д ` : ''}${diff.hours()}ч ${diff.minutes()}м ${diff.seconds()}с`
                } else {
                    countdowns.value[game.id] = 'Ожидаем начала'
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