import { computed } from 'vue'
import type { Ref } from 'vue'
import { usePlayerGameLog } from './usePlayerGameLog'

type StatKey = 'PTS' | 'REB' | 'AST'

export function usePlayerChart(
    playerId: number,
    season: string,
    team: Ref<string | undefined>,
    seasonType: Ref<string | undefined>
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
        games.value.map((g: any) => {
            const { home, away } = parseMatchup(g.MATCHUP)
            return {
                ...g,
                HOME_TEAM_ABBR: home,
                AWAY_TEAM_ABBR: away,
            }
        })
    )

    const filteredGames = computed(() => {
        let g = gamesWithTeams.value

        if (team.value) {
            g = g.filter(
                x =>
                    x.HOME_TEAM_ABBR === team.value ||
                    x.AWAY_TEAM_ABBR === team.value
            )
        }

        if (seasonType.value && seasonType.value !== 'ALL') {
            g = g.filter(x => x.SEASON_TYPE === seasonType.value)
        }

        return g
    })

    const sortedGames = computed(() => {
        return [...filteredGames.value].sort((a, b) => {
            const d1 = new Date(a.GAME_DATE).getTime()
            const d2 = new Date(b.GAME_DATE).getTime()
            return d1 - d2
        })
    })

    function makeDataset(games: any[], key: StatKey, label: string, color: string) {
        return {
            label,
            data: games.map(g => g[key] ?? 0),
            borderColor: color,
            backgroundColor: `${color}33`,
            tension: 0.3,
            fill: true,
        }
    }

    const chartData = computed(() => {
        const g = sortedGames.value

        return {
            labels: g.map(x => x.GAME_DATE),
            datasets: [
                makeDataset(g, 'PTS', 'PTS', '#3b82f6'),
                makeDataset(g, 'REB', 'REB', '#16a34a'),
                makeDataset(g, 'AST', 'AST', '#f59e0b'),
            ]
        }
    })

    return {
        fetchGames,
        loading,
        filteredGames: sortedGames,
        chartData
    }
}