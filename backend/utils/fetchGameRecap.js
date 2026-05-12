const axios = require('axios')
const generateAIRecap = require('./generateAIRecap')
const fetchApNbaRecap = require('./fetchApNbaRecap')
const TEAM_MAP = require('../constants/teamMap')

const PYTHON_API = process.env.PYTHON_API || 'http://python-backend:8000'

async function fetchGameRecap(gameId, periodFilter = null) {
    try {
        let game = null
        let plays = []
        let playersHome = []
        let playersAway = []

        if (periodFilter) {
            const root = await fetchPeriodBoxScore(gameId, periodFilter)

            const box = root?.boxScoreTraditional || root?.game || root

            game = {
                homeTeam: box?.homeTeam || {},
                awayTeam: box?.awayTeam || {},
                gameTimeUTC: root?.meta?.time || null
            }

            playersHome = box?.homeTeam?.players || []
            playersAway = box?.awayTeam?.players || []

            plays = []
        } else {
            const legacy = await fetchLiveOrLegacyGame(gameId)

            game = legacy.game
            plays = legacy.plays

            playersHome = game.homeTeam?.players || []
            playersAway = game.awayTeam?.players || []
        }

        const gameDateUTC = game?.gameTimeUTC || null

        let gameDateMSK = null

        if (gameDateUTC) {
            const date = new Date(gameDateUTC)

            gameDateMSK = date.toLocaleString('ru-RU', {
                timeZone: 'Europe/Moscow',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        }

        const homeTeamId = game?.homeTeam?.teamId
        const awayTeamId = game?.awayTeam?.teamId

        const homeMeta = TEAM_MAP[homeTeamId] || {}
        const awayMeta = TEAM_MAP[awayTeamId] || {}

        const homeTeam = homeMeta.name || game?.homeTeam?.teamName || 'Home'
        const awayTeam = awayMeta.name || game?.awayTeam?.teamName || 'Away'

        const homeAbbr = game?.homeTeam?.teamTricode || homeMeta.abbr || ''
        const awayAbbr = game?.awayTeam?.teamTricode || awayMeta.abbr || ''

        const homeScore = game?.homeTeam?.score ?? 0
        const awayScore = game?.awayTeam?.score ?? 0

        const topPlayers = getTopPlayers(game || {})
        const mvp = topPlayers?.[0] || null

        const runs = plays?.length ? detectRuns(plays) : []
        const keyMoments = plays?.length ? getKeyMoments(plays) : []
        const clutch = plays?.length ? getClutchMoment(plays) : null
        const teamStats = getTeamStats(game || {}, plays || [], {
            homeTeamId,
            awayTeamId
        })
        const leadTracker = plays?.length
            ? getLeadTracker(plays, {
                homeTeamId,
                awayTeamId,
                homeAbbr,
                awayAbbr
            })
            : null

        const insight = getGameInsight(homeScore, awayScore)
        const quarters = getQuarterBreakdown(game || {})

        const aiRecap = generateAIRecap({
            homeTeam,
            awayTeam,
            homeScore,
            awayScore,
            topPlayers,
            mvp,
            runs,
            clutch,
            insight,
            quarters
        })
        const apRecap = !periodFilter
            ? await fetchApNbaRecap({
                homeTeam,
                awayTeam,
                homeAbbr,
                awayAbbr,
                homeScore,
                awayScore,
                gameDateUTC
            })
            : null

        return {
            title: aiRecap?.title || '',
            storyline: aiRecap?.storyline || [],
            insight: aiRecap?.insight || null,
            runs: aiRecap?.runs || null,
            clutch: aiRecap?.clutch || null,
            quarters: aiRecap?.quarters || [],
            apRecap,

            mvp,

            dateUTC: gameDateUTC,
            dateMSK: gameDateMSK,

            meta: {
                homeTeam,
                awayTeam,
                homeAbbr,
                awayAbbr,
                homeScore,
                awayScore,
                runs,
                clutch,
                keyMoments,
                quarters,
                teamStats,
                leadTracker
            },

            players: {
                home: playersHome,
                away: playersAway
            }
        }

    } catch (e) {
        console.error('Recap error:', e)
        return null
    }
}

async function fetchPeriodBoxScore(gameId, periodFilter) {
    const base = await fetchLiveOrLegacyGame(gameId)

    if (periodFilter.startPeriod === periodFilter.endPeriod) {
        const url = `${PYTHON_API}/game-boxscore-v3/${gameId}/quarter/${periodFilter.startPeriod}`
        const res = await axios.get(url)
        return normalizePeriodRoot(res.data, base.game)
    }

    const periodRoots = await Promise.all(
        getPeriodRange(periodFilter.startPeriod, periodFilter.endPeriod)
            .map(async (period) => {
                const url = `${PYTHON_API}/game-boxscore-v3/${gameId}/quarter/${period}`
                const res = await axios.get(url)
                return normalizePeriodRoot(res.data, base.game)
            })
    )

    return mergePeriodBoxScores(periodRoots)
}

function normalizePeriodRoot(root, baseGame) {
    const directBox = root?.boxScoreTraditional || root?.game || root

    if (directBox?.homeTeam?.players?.length || directBox?.awayTeam?.players?.length) {
        return root
    }

    const resultSets = getResultSets(root)
    const playerStats = rowsToObjects(findResultSet(resultSets, 'PlayerStats'))
    const teamStats = rowsToObjects(findResultSet(resultSets, 'TeamStats'))
    const homeTeamId = Number(baseGame?.homeTeam?.teamId)
    const awayTeamId = Number(baseGame?.awayTeam?.teamId)

    if (!playerStats.length || !homeTeamId || !awayTeamId) {
        return root
    }

    return {
        ...root,
        boxScoreTraditional: {
            gameId: baseGame?.gameId,
            gameTimeUTC: baseGame?.gameTimeUTC,
            homeTeam: {
                ...baseGame.homeTeam,
                ...buildLegacyTeam({
                    teamId: homeTeamId,
                    lineScore: [],
                    teamStats,
                    playerStats
                })
            },
            awayTeam: {
                ...baseGame.awayTeam,
                ...buildLegacyTeam({
                    teamId: awayTeamId,
                    lineScore: [],
                    teamStats,
                    playerStats
                })
            }
        }
    }
}

function getResultSets(root) {
    const resultSets = root?.resultSets

    if (Array.isArray(resultSets)) return resultSets

    if (!resultSets || typeof resultSets !== 'object') return []

    return Object.entries(resultSets).map(([name, value]) => {
        if (Array.isArray(value)) {
            return {
                name,
                headers: value[0] ? Object.keys(value[0]) : [],
                rowSet: value
            }
        }

        return {
            name,
            ...(value || {})
        }
    })
}

function getPeriodRange(startPeriod, endPeriod) {
    const periods = []

    for (let period = startPeriod; period <= endPeriod; period += 1) {
        periods.push(period)
    }

    return periods
}

function mergePeriodBoxScores(roots) {
    const validRoots = roots.filter((root) => !root?.error)
    const firstRoot = validRoots[0] || roots[0] || {}
    const firstBox = firstRoot?.boxScoreTraditional || firstRoot?.game || firstRoot
    const mergedBox = {
        ...firstBox,
        homeTeam: mergeTeamPeriods(validRoots, 'homeTeam'),
        awayTeam: mergeTeamPeriods(validRoots, 'awayTeam')
    }

    if (firstRoot?.boxScoreTraditional) {
        return {
            ...firstRoot,
            boxScoreTraditional: mergedBox
        }
    }

    if (firstRoot?.game) {
        return {
            ...firstRoot,
            game: mergedBox
        }
    }

    return mergedBox
}

function mergeTeamPeriods(roots, teamKey) {
    const teams = roots
        .map((root) => (root?.boxScoreTraditional || root?.game || root)?.[teamKey])
        .filter(Boolean)
    const firstTeam = teams[0] || {}
    const playersById = new Map()

    for (const team of teams) {
        for (const player of team.players || []) {
            const id = String(player.personId || player.playerId || player.PLAYER_ID || player.name || '')
            const existing = playersById.get(id)

            playersById.set(id, existing ? mergePlayerPeriods(existing, player) : clonePlayer(player))
        }
    }

    return {
        ...firstTeam,
        score: sumTeams(teams, 'score'),
        statistics: mergeStatistics(teams.map((team) => team.statistics || team.stats || {})),
        players: Array.from(playersById.values())
    }
}

function clonePlayer(player) {
    return {
        ...player,
        statistics: {
            ...(player.statistics || player.stats || {})
        }
    }
}

function mergePlayerPeriods(base, next) {
    return {
        ...base,
        statistics: mergeStatistics([
            base.statistics || base.stats || {},
            next.statistics || next.stats || {}
        ])
    }
}

function mergeStatistics(statsList) {
    const merged = {}
    const percentageKeys = new Set([
        'fieldGoalsPercentage',
        'fgPercentage',
        'fgPct',
        'threePointersPercentage',
        'threePointPercentage',
        'fg3Pct',
        'tpPct',
        'freeThrowsPercentage',
        'ftPercentage',
        'ftPct'
    ])

    for (const stats of statsList) {
        for (const [key, value] of Object.entries(stats || {})) {
            if (percentageKeys.has(key)) continue

            if (key === 'minutes' || key === 'minutesCalculated') {
                merged[key] = formatIsoMinutes(parseStatMinutes(merged[key]) + parseStatMinutes(value))
                continue
            }

            if (typeof value === 'number') {
                merged[key] = Number(merged[key] || 0) + value
                continue
            }

            const numeric = Number(value)

            if (value !== '' && Number.isFinite(numeric)) {
                merged[key] = Number(merged[key] || 0) + numeric
            } else if (merged[key] === undefined) {
                merged[key] = value
            }
        }
    }

    addDerivedPercentages(merged)

    return merged
}

function parseStatMinutes(value) {
    if (typeof value === 'number') return value

    const raw = String(value || '')
    const isoMatch = raw.match(/PT(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/)

    if (isoMatch) {
        return Number(isoMatch[1] || 0) + Number(isoMatch[2] || 0) / 60
    }

    const clockMatch = raw.match(/^(\d+):(\d+)/)

    if (clockMatch) {
        return Number(clockMatch[1] || 0) + Number(clockMatch[2] || 0) / 60
    }

    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : 0
}

function formatIsoMinutes(value) {
    const minutes = Math.floor(value)
    const seconds = Math.round((value - minutes) * 60)

    return `PT${minutes}M${seconds}S`
}

function addDerivedPercentages(stats) {
    const fgM = Number(stats.fieldGoalsMade ?? stats.fgm ?? 0)
    const fgA = Number(stats.fieldGoalsAttempted ?? stats.fga ?? 0)
    const tpM = Number(stats.threePointersMade ?? stats.fg3m ?? 0)
    const tpA = Number(stats.threePointersAttempted ?? stats.fg3a ?? 0)
    const ftM = Number(stats.freeThrowsMade ?? stats.ftm ?? 0)
    const ftA = Number(stats.freeThrowsAttempted ?? stats.fta ?? 0)

    if (fgA) stats.fieldGoalsPercentage = +(fgM / fgA).toFixed(3)
    if (tpA) stats.threePointersPercentage = +(tpM / tpA).toFixed(3)
    if (ftA) stats.freeThrowsPercentage = +(ftM / ftA).toFixed(3)
}

function sumTeams(teams, key) {
    return teams.reduce((total, team) => total + Number(team?.[key] || 0), 0)
}

function getFirstNumber(source, keys) {
    for (const key of keys) {
        const value = source?.[key]
        if (value !== undefined && value !== null && value !== '') {
            const parsed = Number(value)
            return Number.isFinite(parsed) ? parsed : 0
        }
    }

    return 0
}

async function fetchLiveOrLegacyGame(gameId) {
    try {
        const boxUrl = `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`
        const pbpUrl = `https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`

        const [boxRes, pbpRes] = await Promise.all([
            axios.get(boxUrl),
            axios.get(pbpUrl)
        ])

        const game = boxRes.data?.game || {}

        if (!game?.homeTeam?.teamId || !game?.awayTeam?.teamId) {
            throw new Error('LiveData box score is missing teams')
        }

        let plays = pbpRes.data?.game?.actions || []

        try {
            const supplement = await fetchLegacySupplement(gameId)
            applyLegacySupplement(game, supplement)

            if (!plays.length && supplement.plays.length) {
                plays = supplement.plays
            }
        } catch (supplementError) {
            console.warn(`[game recap] Stats API supplement unavailable for ${gameId}:`, supplementError?.message || supplementError)
        }

        return {
            game,
            plays
        }
    } catch (error) {
        console.warn(`[game recap] Falling back to stats.nba.com box score for ${gameId}:`, error?.message || error)
        return fetchLegacyGame(gameId)
    }
}

async function fetchLegacySupplement(gameId) {
    const res = await axios.get(`${PYTHON_API}/game-detail/${gameId}`)
    const root = res.data || {}

    if (root.error) {
        throw new Error(root.error)
    }

    const miscSets = root.misc?.resultSets || []
    const playByPlaySets = root.playByPlay?.resultSets || []
    const miscTeamStats = getLegacyMiscTeamStats(miscSets)
    const playByPlay = rowsToObjects(findResultSet(playByPlaySets, 'PlayByPlay'))
    const teamStatsById = new Map()

    miscTeamStats.forEach((row) => {
        const teamId = Number(row.TEAM_ID ?? row.teamId)
        if (!teamId) return

        teamStatsById.set(teamId, {
            pointsInThePaint: toNumber(row.PTS_PAINT ?? row.POINTS_IN_PAINT ?? row.pointsPaint),
            pointsSecondChance: toNumber(row.PTS_2ND_CHANCE ?? row.POINTS_SECOND_CHANCE ?? row.pointsSecondChance),
            pointsFastBreak: toNumber(row.PTS_FB ?? row.POINTS_FAST_BREAK ?? row.pointsFastBreak)
        })
    })

    return {
        teamStatsById,
        plays: buildLegacyPlays(playByPlay)
    }
}

function applyLegacySupplement(game, supplement) {
    for (const side of ['homeTeam', 'awayTeam']) {
        const team = game?.[side]
        const stats = supplement.teamStatsById.get(Number(team?.teamId))

        if (!stats) continue

        team.statistics = {
            ...(team.statistics || {}),
            pointsInThePaint: stats.pointsInThePaint,
            pointsSecondChance: stats.pointsSecondChance,
            pointsFastBreak: stats.pointsFastBreak
        }
    }
}

async function fetchLegacyGame(gameId) {
    const res = await axios.get(`${PYTHON_API}/game-detail/${gameId}`)
    const root = res.data || {}

    if (root.error) {
        throw new Error(root.error)
    }

    const summarySets = root.summary?.resultSets || []
    const boxScoreSets = root.boxscore?.resultSets || []
    const miscSets = root.misc?.resultSets || []
    const playByPlaySets = root.playByPlay?.resultSets || []

    const gameSummary = rowsToObjects(findResultSet(summarySets, 'GameSummary'))[0] || {}
    const lineScore = rowsToObjects(findResultSet(summarySets, 'LineScore'))
    const playerStats = rowsToObjects(findResultSet(boxScoreSets, 'PlayerStats'))
    const teamStats = rowsToObjects(findResultSet(boxScoreSets, 'TeamStats'))
    const miscTeamStats = getLegacyMiscTeamStats(miscSets)
    const playByPlay = rowsToObjects(findResultSet(playByPlaySets, 'PlayByPlay'))

    const homeTeamId = Number(gameSummary.HOME_TEAM_ID)
    const awayTeamId = Number(gameSummary.VISITOR_TEAM_ID)

    if (!homeTeamId || !awayTeamId) {
        throw new Error('Legacy box score is missing teams')
    }

    return {
        game: {
            gameId,
            gameTimeUTC: parseLegacyGameDate(gameSummary.GAME_DATE_EST),
            homeTeam: buildLegacyTeam({
                teamId: homeTeamId,
                lineScore,
                teamStats,
                miscTeamStats,
                playerStats
            }),
            awayTeam: buildLegacyTeam({
                teamId: awayTeamId,
                lineScore,
                teamStats,
                miscTeamStats,
                playerStats
            })
        },
        plays: buildLegacyPlays(playByPlay)
    }
}

function findResultSet(resultSets, name) {
    return resultSets.find((set) => set.name === name)
}

function rowsToObjects(resultSet) {
    const headers = resultSet?.headers || []
    const rows = resultSet?.rowSet || []

    if (rows.length && typeof rows[0] === 'object' && !Array.isArray(rows[0])) {
        return rows
    }

    return rows.map((row) => {
        const obj = {}

        headers.forEach((header, index) => {
            obj[header] = row[index]
        })

        return obj
    })
}

function parseLegacyGameDate(value) {
    if (!value) return null

    const parsed = new Date(value)

    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString()
    }

    return value
}

function getLegacyMiscTeamStats(resultSets) {
    const sets = resultSets
        .map((set) => rowsToObjects(set))
        .filter((rows) => rows.some((row) => row.TEAM_ID !== undefined || row.teamId !== undefined))

    return sets
        .flat()
        .filter((row) => {
            const playerId = row.PLAYER_ID ?? row.personId
            return playerId === undefined || playerId === null || playerId === '' || Number(playerId) === 0
        })
}

function pickLegacyMiscTeam(miscTeamStats, teamId) {
    return miscTeamStats.find((row) => Number(row.TEAM_ID ?? row.teamId) === teamId) || {}
}

function buildLegacyTeam({ teamId, lineScore, teamStats, miscTeamStats, playerStats }) {
    const teamMeta = TEAM_MAP[teamId] || {}
    const line = lineScore.find((row) => Number(row.TEAM_ID) === teamId) || {}
    const stats = teamStats.find((row) => Number(row.TEAM_ID) === teamId) || {}
    const misc = pickLegacyMiscTeam(miscTeamStats, teamId)
    const abbr = line.TEAM_ABBREVIATION || stats.TEAM_ABBREVIATION || teamMeta.abbr || ''

    return {
        teamId,
        teamName: teamMeta.name || stats.TEAM_NAME || line.TEAM_NAME || abbr,
        teamTricode: abbr,
        score: toNumber(line.PTS ?? stats.PTS),
        periods: getLegacyPeriods(line),
        statistics: {
            points: toNumber(stats.PTS ?? line.PTS),
            reboundsTotal: toNumber(stats.REB),
            reboundsOffensive: toNumber(stats.OREB),
            reboundsDefensive: toNumber(stats.DREB),
            assists: toNumber(stats.AST),
            steals: toNumber(stats.STL),
            blocks: toNumber(stats.BLK),
            turnovers: toNumber(stats.TO),
            fieldGoalsMade: toNumber(stats.FGM),
            fieldGoalsAttempted: toNumber(stats.FGA),
            fieldGoalsPercentage: toNumber(stats.FG_PCT),
            threePointersMade: toNumber(stats.FG3M),
            threePointersAttempted: toNumber(stats.FG3A),
            threePointersPercentage: toNumber(stats.FG3_PCT),
            freeThrowsMade: toNumber(stats.FTM),
            freeThrowsAttempted: toNumber(stats.FTA),
            freeThrowsPercentage: toNumber(stats.FT_PCT),
            pointsInThePaint: toNumber(misc.PTS_PAINT ?? misc.POINTS_IN_PAINT ?? misc.pointsPaint),
            pointsSecondChance: toNumber(misc.PTS_2ND_CHANCE ?? misc.POINTS_SECOND_CHANCE ?? misc.pointsSecondChance),
            pointsFastBreak: toNumber(misc.PTS_FB ?? misc.POINTS_FAST_BREAK ?? misc.pointsFastBreak)
        },
        players: playerStats
            .filter((row) => Number(row.TEAM_ID) === teamId)
            .map((row) => buildLegacyPlayer(row, teamId))
    }
}

function buildLegacyPlayer(row, teamId) {
    const hasMinutes = row.MIN !== undefined && row.MIN !== null && row.MIN !== ''

    return {
        personId: row.PLAYER_ID,
        playerId: row.PLAYER_ID,
        teamId,
        name: row.PLAYER_NAME,
        position: row.START_POSITION || '',
        jerseyNum: row.JERSEY_NUM || null,
        notPlayingReason: hasMinutes ? null : 'DNP',
        notPlayingDescription: row.COMMENT || '',
        statistics: {
            minutes: row.MIN || 0,
            points: toNumber(row.PTS),
            assists: toNumber(row.AST),
            reboundsTotal: toNumber(row.REB),
            reboundsOffensive: toNumber(row.OREB),
            reboundsDefensive: toNumber(row.DREB),
            steals: toNumber(row.STL),
            blocks: toNumber(row.BLK),
            turnovers: toNumber(row.TO),
            foulsPersonal: toNumber(row.PF),
            plusMinusPoints: toNumber(row.PLUS_MINUS),
            fieldGoalsMade: toNumber(row.FGM),
            fieldGoalsAttempted: toNumber(row.FGA),
            threePointersMade: toNumber(row.FG3M),
            threePointersAttempted: toNumber(row.FG3A),
            freeThrowsMade: toNumber(row.FTM),
            freeThrowsAttempted: toNumber(row.FTA)
        }
    }
}

function parseLegacyScore(score) {
    const match = String(score || '').match(/(\d+)\s*-\s*(\d+)/)
    if (!match) return null

    return {
        awayScore: toNumber(match[1]),
        homeScore: toNumber(match[2])
    }
}

function buildLegacyPlays(playByPlay) {
    return playByPlay
        .map((row, index) => {
            const score = parseLegacyScore(row.SCORE)
            const hasV3Score = hasScoreValue(row.scoreHome) && hasScoreValue(row.scoreAway)

            if (!score && !hasV3Score) return null

            const homeScore = toNumber(row.scoreHome ?? score?.homeScore)
            const awayScore = toNumber(row.scoreAway ?? score?.awayScore)

            if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null

            return {
                actionNumber: row.EVENTNUM ?? row.actionNumber ?? index,
                period: toNumber(row.PERIOD ?? row.period) || 1,
                clock: row.clock || legacyClockToIso(row.PCTIMESTRING),
                scoreHome: homeScore,
                scoreAway: awayScore
            }
        })
        .filter(Boolean)
}

function hasScoreValue(value) {
    return value !== undefined && value !== null && value !== ''
}

function legacyClockToIso(clock) {
    const match = String(clock || '').match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return ''

    return `PT${toNumber(match[1])}M${toNumber(match[2])}S`
}

function getLegacyPeriods(line) {
    const periods = []

    for (let i = 1; i <= 4; i += 1) {
        periods.push({
            period: i,
            score: toNumber(line[`PTS_QTR${i}`])
        })
    }

    for (let i = 1; i <= 10; i += 1) {
        const score = line[`PTS_OT${i}`]
        if (score === undefined || score === null || score === '') continue

        periods.push({
            period: 4 + i,
            score: toNumber(score)
        })
    }

    return periods
}

function toNumber(value) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

function getTeamStats(game) {
    const homeStats = game?.homeTeam?.statistics || game?.homeTeam?.stats || {}
    const awayStats = game?.awayTeam?.statistics || game?.awayTeam?.stats || {}
    const homePlayerStats = game?.homeTeam?.players || []
    const awayPlayerStats = game?.awayTeam?.players || []

    const pick = (stats, keys) => getFirstNumber(stats, keys)
    const sumPlayers = (players, keys) => players.reduce((total, player) => {
        const stats = player?.statistics || player?.stats || {}
        return total + pick(stats, keys)
    }, 0)
    const pct = (stats, keys) => {
        const value = pick(stats, keys)
        return value <= 1 && value > 0 ? +(value * 100).toFixed(1) : +value.toFixed(1)
    }

    const build = (stats, fallbackPoints, players) => {
        const playerSecondChance = sumPlayers(players, ['pointsSecondChance', 'secondChancePoints'])

        return {
            points: pick(stats, ['points', 'pts']) || Number(fallbackPoints || 0),
            rebounds: pick(stats, ['reboundsTotal', 'rebounds', 'reb']),
            assists: pick(stats, ['assists', 'ast']),
            steals: pick(stats, ['steals', 'stl']),
            blocks: pick(stats, ['blocks', 'blk']),
            turnovers: pick(stats, ['turnovers', 'tov']),
            fgPct: pct(stats, ['fieldGoalsPercentage', 'fgPercentage', 'fgPct']),
            tpPct: pct(stats, ['threePointersPercentage', 'threePointPercentage', 'fg3Pct', 'tpPct']),
            ftPct: pct(stats, ['freeThrowsPercentage', 'ftPercentage', 'ftPct']),
            pointsInThePaint: pick(stats, ['pointsInThePaint', 'pointsPaint', 'pitp']),
            secondChancePoints: playerSecondChance || pick(stats, ['pointsSecondChance', 'secondChancePoints']),
            fastBreakPoints: pick(stats, ['pointsFastBreak', 'fastBreakPoints'])
        }
    }

    return {
        home: build(homeStats, game?.homeTeam?.score, homePlayerStats),
        away: build(awayStats, game?.awayTeam?.score, awayPlayerStats)
    }
}

function parseClockSeconds(clock) {
    if (!clock) return 0

    const match = String(clock).match(/PT(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/)
    if (!match) return 0

    const minutes = Number(match[1] || 0)
    const seconds = Number(match[2] || 0)

    return minutes * 60 + seconds
}

function getLeadTracker(plays, teams) {
    const points = []
    let biggestHomeLead = 0
    let biggestAwayLead = 0
    let timesTied = 0
    let leadChanges = 0
    let previousLeader = null
    let previousDiff = null

    for (const play of plays) {
        const homeScore = Number(play?.scoreHome)
        const awayScore = Number(play?.scoreAway)

        if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
            continue
        }

        const period = Number(play?.period || 1)
        const periodLength = period <= 4 ? 720 : 300
        const elapsed = (Math.max(period, 1) - 1) * 720 + (periodLength - parseClockSeconds(play?.clock))
        const diff = homeScore - awayScore
        const leader = diff > 0 ? 'home' : diff < 0 ? 'away' : null

        biggestHomeLead = Math.max(biggestHomeLead, diff)
        biggestAwayLead = Math.max(biggestAwayLead, Math.abs(Math.min(diff, 0)))

        if (diff === 0 && previousDiff !== null && previousDiff !== 0) {
            timesTied += 1
        } else if (previousLeader && leader && previousLeader !== leader) {
            leadChanges += 1
        }

        if (leader) {
            previousLeader = leader
        }

        previousDiff = diff

        points.push({
            actionNumber: play?.actionNumber || points.length,
            period,
            clock: play?.clock || '',
            elapsed: Math.max(0, elapsed),
            homeScore,
            awayScore,
            diff
        })
    }

    const longestRun = detectRuns(plays)[0]?.points || 0

    return {
        teams,
        points,
        summary: {
            biggestHomeLead,
            biggestAwayLead,
            timesTied,
            leadChanges,
            longestRun
        }
    }
}


function getTopPlayers(game) {
    const homePlayers = (game.homeTeam?.players || []).map(p => ({
        ...p,
        TEAM_ID: game.homeTeam?.teamId
    }))

    const awayPlayers = (game.awayTeam?.players || []).map(p => ({
        ...p,
        TEAM_ID: game.awayTeam?.teamId
    }))

    const players = [...homePlayers, ...awayPlayers]

    return players
        .map(p => {
            const pts = p.statistics?.points ?? p.stats?.pts ?? 0
            const ast = p.statistics?.assists ?? p.stats?.ast ?? 0
            const reb = p.statistics?.reboundsTotal ?? p.stats?.reb ?? 0

            return {
                name: p.name,
                PLAYER_ID: p.personId || p.playerId || null,
                TEAM_ID: p.TEAM_ID || null,
                points: pts,
                assists: ast,
                rebounds: reb,
                stats: `${pts} pts / ${ast} ast / ${reb} reb`
            }
        })
        .filter(p => p.name)
        .sort((a, b) =>
            (b.points + b.assists * 1.5 + b.rebounds * 1.2) -
            (a.points + a.assists * 1.5 + a.rebounds * 1.2)
        )
        .slice(0, 5)
}


function detectRuns(plays) {
    let runs = []
    let currentRun = { team: null, points: 0 }
    let previousHomeScore = 0
    let previousAwayScore = 0

    for (let p of plays) {
        const homeScore = Number(p?.scoreHome)
        const awayScore = Number(p?.scoreAway)

        if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
            continue
        }

        const homeDelta = homeScore - previousHomeScore
        const awayDelta = awayScore - previousAwayScore
        const team = homeDelta > 0 ? 'home' : awayDelta > 0 ? 'away' : null
        const pts = Math.max(homeDelta, awayDelta, 0)

        previousHomeScore = homeScore
        previousAwayScore = awayScore

        if (!pts || !team) continue

        if (currentRun.team === team) {
            currentRun.points += pts
        } else {
            if (currentRun.points >= 8) {
                runs.push({ ...currentRun })
            }
            currentRun = { team, points: pts }
        }
    }

    if (currentRun.points >= 8) {
        runs.push(currentRun)
    }

    return runs
        .sort((a, b) => b.points - a.points)
        .slice(0, 3)
}

function extractPoints(desc) {
    if (!desc) return 0
    if (desc.includes('3PT')) return 3
    if (desc.includes('free throw')) return 1
    if (desc.includes('shot') || desc.includes('dunk') || desc.includes('layup')) return 2
    return 0
}


function getKeyMoments(plays) {
    return plays
        .slice(-12)
        .filter(p =>
            p?.description?.toLowerCase().includes('3pt') ||
            p?.description?.toLowerCase().includes('block') ||
            p?.description?.toLowerCase().includes('steal')
        )
        .slice(-5)
        .map(p => p.description)
}

function getClutchMoment(plays) {
    const last = plays.slice(-20)

    const clutch = last.find(p =>
        p?.description?.toLowerCase().includes('3pt') ||
        p?.description?.toLowerCase().includes('lead') ||
        p?.description?.toLowerCase().includes('block')
    )

    return clutch?.description || null
}


function getGameInsight(homeScore, awayScore) {
    const diff = Math.abs(homeScore - awayScore)

    if (diff >= 20) return 'Blowout'
    if (diff >= 10) return 'Comfortable win'
    if (diff >= 5) return 'Competitive game'
    return 'Down to the wire'
}


function getQuarterBreakdown(game) {
    try {
        const home = game.homeTeam?.periods || []
        const away = game.awayTeam?.periods || []

        return home.map((_, i) =>
            `Q${i + 1}: ${away[i]?.score || 0}-${home[i]?.score || 0}`
        )
    } catch {
        return []
    }
}

module.exports = fetchGameRecap
