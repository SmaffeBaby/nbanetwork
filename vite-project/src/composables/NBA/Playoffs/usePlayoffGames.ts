import { ref, reactive } from 'vue'
import { generateNbaSeasons } from '../../../utils/generateNbaSeasons'

type RawGame = {
    GAME_ID: string
    GAME_DATE: string
    MATCHUP: string
    PTS: number
    WL: string
}

type Game = {
    GAME_ID: string
    GAME_DATE: string
    home: { team: string; pts: number; wl: string }
    away: { team: string; pts: number; wl: string }
}

type Series = {
    key: string
    teamA: string
    teamB: string
    games: Game[]
}

const TEAM_ALIASES: Record<string, string> = {
    ATL: 'Hawks',
    BOS: 'Celtics',
    BKN: 'Nets',
    CHA: 'Hornets',
    CHI: 'Bulls',
    CLE: 'Cavaliers',
    DAL: 'Mavericks',
    DEN: 'Nuggets',
    DET: 'Pistons',
    GSW: 'Warriors',
    HOU: 'Rockets',
    IND: 'Pacers',
    LAC: 'Clippers',
    LAL: 'Lakers',
    MEM: 'Grizzlies',
    MIA: 'Heat',
    MIL: 'Bucks',
    MIN: 'Timberwolves',
    NOP: 'Pelicans',
    NYK: 'Knicks',
    OKC: 'Thunder',
    ORL: 'Magic',
    PHI: '76ers',
    PHX: 'Suns',
    POR: 'Trail Blazers',
    SAC: 'Kings',
    SAS: 'Spurs',
    TOR: 'Raptors',
    UTA: 'Jazz',
    WAS: 'Wizards'
}

export function usePlayoffGames() {
    const seasons = ref(generateNbaSeasons(2000))
    const selectedSeason = ref(seasons.value[0])

    const series = ref<Series[]>([])
    const opened = reactive<Record<number, boolean>>({})

    const standingsMap = ref<Record<string, number>>({})
    const playoffSeedMap = ref<Record<string, number>>({})

    function normalizeTeamName(team: string) {
        const clean = team.trim()
        return TEAM_ALIASES[clean] || clean
    }

    function formatTeam(team: string) {
        return normalizeTeamName(team)
    }

    function getSeed(team: string) {
        const normalized = normalizeTeamName(team)

        const playoffSeed = playoffSeedMap.value[normalized]
        if (playoffSeed) return `(#${playoffSeed})`

        const rank = standingsMap.value[normalized]
        return rank ? `(#${rank})` : ''
    }

    function toggleSeries(idx: number) {
        opened[idx] = !opened[idx]
    }

    async function fetchStandings(season: string) {
        try {
            const res = await fetch(`/api/standings/${season}`)
            const json = await res.json()

            const resultSet = json?.resultSets?.[0]

            if (!resultSet) {
                standingsMap.value = {}
                return
            }

            const headers: string[] = resultSet.headers
            const rows: any[] = resultSet.rowSet

            const TEAM_INDEX = headers.indexOf('TeamName')
            const RANK_INDEX =
                headers.indexOf('PlayoffRank') !== -1
                    ? headers.indexOf('PlayoffRank')
                    : headers.indexOf('ConfRank')

            const map: Record<string, number> = {}

            for (const row of rows) {
                const team = row[TEAM_INDEX]
                const rank = row[RANK_INDEX]

                if (team && rank != null) {
                    map[normalizeTeamName(team)] = Number(rank)
                }
            }

            standingsMap.value = map
        } catch (e) {
            console.error('❌ standings error:', e)
        }
    }

    function parseTeams(matchup: string) {
        if (matchup.includes(' vs. ')) {
            const [home, away] = matchup.split(' vs. ')
            return {
                home: normalizeTeamName(home),
                away: normalizeTeamName(away)
            }
        }

        if (matchup.includes(' @ ')) {
            const [away, home] = matchup.split(' @ ')
            return {
                home: normalizeTeamName(home),
                away: normalizeTeamName(away)
            }
        }

        return { home: '', away: '' }
    }

    function normalize(raw: RawGame[]): Game[] {
        const map = new Map<
            string,
            Game & { teams: Record<string, { pts: number; wl: string }> }
        >()

        for (const g of raw) {
            if (!map.has(g.GAME_ID)) {
                const t = parseTeams(g.MATCHUP)

                map.set(g.GAME_ID, {
                    GAME_ID: g.GAME_ID,
                    GAME_DATE: g.GAME_DATE,
                    home: { team: t.home, pts: 0, wl: '' },
                    away: { team: t.away, pts: 0, wl: '' },
                    teams: {}
                })
            }

            const entry = map.get(g.GAME_ID)!

            const rawTeam = g.MATCHUP.includes('@')
                ? g.MATCHUP.split('@')[0].trim()
                : g.MATCHUP.includes('vs')
                    ? g.MATCHUP.split('vs')[0].trim()
                    : ''

            const team = normalizeTeamName(rawTeam)

            entry.teams[team] = {
                pts: g.PTS,
                wl: g.WL
            }
        }

        for (const game of map.values()) {
            const home = game.home.team
            const away = game.away.team

            game.home.pts = game.teams[home]?.pts ?? 0
            game.home.wl = game.teams[home]?.wl ?? ''

            game.away.pts = game.teams[away]?.pts ?? 0
            game.away.wl = game.teams[away]?.wl ?? ''
        }

        return Array.from(map.values())
    }

    function buildSeries(games: Game[]): Series[] {
        const map = new Map<string, Series>()

        for (const g of games) {
            const teams = [g.home.team, g.away.team].sort()
            const key = teams.join('-')

            if (!map.has(key)) {
                map.set(key, {
                    key,
                    teamA: teams[0],
                    teamB: teams[1],
                    games: []
                })
            }

            map.get(key)!.games.push(g)
        }

        return Array.from(map.values())
    }

    function buildPlayoffSeedOverrides(seriesList: Series[]) {
        const map: Record<string, number> = {}

        const getSeriesStartDate = (s: Series) => {
            const dates = s.games
                .map(g => new Date(g.GAME_DATE).getTime())
                .filter(Boolean)

            return Math.min(...dates)
        }

        const seriesWithStartDate = seriesList.map(s => ({
            series: s,
            startDate: getSeriesStartDate(s)
        }))

        const firstPlayoffDate = Math.min(
            ...seriesWithStartDate.map(s => s.startDate)
        )

        const firstRoundSeries = seriesWithStartDate
            .filter(s => s.startDate <= firstPlayoffDate + 3 * 24 * 60 * 60 * 1000)
            .map(s => s.series)

        for (const s of firstRoundSeries) {
            const teamA = normalizeTeamName(s.teamA)
            const teamB = normalizeTeamName(s.teamB)

            const rankA = standingsMap.value[teamA]
            const rankB = standingsMap.value[teamB]

            if (rankA === 1 && rankB) map[teamB] = 8
            if (rankB === 1 && rankA) map[teamA] = 8

            if (rankA === 2 && rankB) map[teamB] = 7
            if (rankB === 2 && rankA) map[teamA] = 7
        }

        playoffSeedMap.value = map
    }

    function getSeriesScore(s: Series) {
        let a = 0
        let b = 0

        for (const g of s.games) {
            if (g.home.wl === 'W') {
                g.home.team === s.teamA ? a++ : b++
            }

            if (g.away.wl === 'W') {
                g.away.team === s.teamA ? a++ : b++
            }
        }

        return `${a} - ${b}`
    }

    async function fetchGames(season: string) {
        try {
            const res = await fetch(`/api/playoffs/${season}`)
            const data = await res.json()

            series.value = buildSeries(normalize(data.games || []))

            for (const k in opened) delete opened[k]
        } catch (e) {
            console.error('❌ playoffs error:', e)
        }
    }

    async function loadAll(season: string) {
        playoffSeedMap.value = {}

        await fetchStandings(season)
        await fetchGames(season)

        buildPlayoffSeedOverrides(series.value)
    }

    return {
        seasons,
        selectedSeason,
        series,
        opened,
        formatTeam,
        getSeed,
        getSeriesScore,
        toggleSeries,
        loadAll
    }
}