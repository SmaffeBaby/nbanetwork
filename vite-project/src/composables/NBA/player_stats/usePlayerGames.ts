import { ref, computed, watch } from 'vue'
import { usePlayerGameLog } from './usePlayerGameLog'

export type GameRaw = {
    GAME_DATE: string
    MATCHUP: string
    WL?: string
    MIN?: number
    PTS?: number
    REB?: number
    AST?: number
    STL?: number
    BLK?: number
    TOV?: number
    HOME_SCORE?: number
    AWAY_SCORE?: number
    HOME_TEAM_ABBR?: string | null
    AWAY_TEAM_ABBR?: string | null
    Game_ID: string | number
    SEASON_TYPE?: string
}

export function usePlayerGames(player: any, team: any, season: string) {
    const rawGames = ref<GameRaw[]>([])
    const seasonTypeFilter = ref<'ALL' | 'Regular' | 'Playoffs'>('ALL')

    function parseMatchup(matchup: string) {
        if (!matchup) return { home: null, away: null }

        if (matchup.includes(' @ ')) {
            const [away, home] = matchup.split(' @ ')
            return { home, away }
        }

        if (matchup.includes(' vs. ')) {
            const [home, away] = matchup.split(' vs. ')
            return { home, away }
        }

        const match = matchup.match(/\b[A-Z]{2,3}\b/g)
        return { home: match?.[0] ?? null, away: match?.[1] ?? null }
    }

    watch(player, async (p) => {
        if (!p) return

        const composable = usePlayerGameLog(p.PLAYER_ID, season)
        await composable.fetchGames()

        const list = composable.games?.value ?? []

        rawGames.value = list.map((g: any) => {
            const { home, away } = parseMatchup(g.MATCHUP)

            return {
                ...g,
                Game_ID: g.Game_ID ?? g.GAME_ID ?? '',
                HOME_TEAM_ABBR: home,
                AWAY_TEAM_ABBR: away,
            }
        })
    }, { immediate: true })

    const filteredGames = computed(() => {
        if (!player.value) return []

        let games = [...rawGames.value]
        const playerTeam = player.value.TEAM_ABBREVIATION

        if (team.value) {
            games = games.filter(g =>
                (g.HOME_TEAM_ABBR === playerTeam && g.AWAY_TEAM_ABBR === team.value) ||
                (g.AWAY_TEAM_ABBR === playerTeam && g.HOME_TEAM_ABBR === team.value)
            )
        } else {
            games = games.filter(g =>
                g.HOME_TEAM_ABBR === playerTeam || g.AWAY_TEAM_ABBR === playerTeam
            )
        }

        if (seasonTypeFilter.value !== 'ALL') {
            games = games.filter(g =>
                g.SEASON_TYPE === seasonTypeFilter.value
            )
        }

        return games
    })

    return {
        rawGames,
        filteredGames,
        seasonTypeFilter,
    }
}