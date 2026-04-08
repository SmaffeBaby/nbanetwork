import { computed } from 'vue'
import type { Ref } from 'vue'
import { usePlayerGameLog } from './usePlayerGameLog'

type StatKey = 'PTS' | 'REB' | 'AST'

export function usePlayerChart(
    playerId: number,
    season: string,
    team: Ref<string | undefined>
) {
    const { games, fetchGames, loading } = usePlayerGameLog(playerId, season)

    function parseMatchup(matchup: string) {
        let home: string | null = null
        let away: string | null = null

        if (matchup.includes(' @ ')) [away, home] = matchup.split(' @ ')
        else if (matchup.includes(' vs. ')) [home, away] = matchup.split(' vs. ')
        else {
            const match = matchup.match(/\b[A-Z]{2,3}\b/g)
            if (match && match.length >= 2) {
                home = match[0]
                away = match[1]
            }
        }

        return { home, away }
    }

    const gamesWithTeams = computed(() =>
        games.value.map(g => {
            const { home, away } = parseMatchup(g.MATCHUP)
            return { ...g, HOME_TEAM_ABBR: home, AWAY_TEAM_ABBR: away }
        })
    )

    const filteredGames = computed(() => {
        if (!team.value) return gamesWithTeams.value
        return gamesWithTeams.value.filter(
            g => g.HOME_TEAM_ABBR === team.value || g.AWAY_TEAM_ABBR === team.value
        )
    })

    const chartData = computed(() => {
        const labels = filteredGames.value.map(g => g.GAME_DATE)

        const makeDataset = (key: StatKey, label: string, color: string) => ({
            label,
            data: filteredGames.value.map(g => g[key] ?? 0),
            borderColor: color,
            backgroundColor: `${color}33`,
            tension: 0.3,
            fill: true,
        })

        return {
            labels,
            datasets: [
                makeDataset('PTS', 'PTS', '#3b82f6'),
                makeDataset('REB', 'REB', '#16a34a'),
                makeDataset('AST', 'AST', '#f59e0b'),
            ]
        }
    })

    return { fetchGames, loading, filteredGames, chartData }
}