const axios = require('axios')
const generateAIRecap = require('./generateAIRecap')
const TEAM_MAP = require('../constants/teamMap')

async function fetchGameRecap(gameId, quarter = null) {
    try {
        let game = null
        let plays = []
        let playersHome = []
        let playersAway = []

        if (quarter) {
            const url = `http://python-backend:8000/game-boxscore-v3/${gameId}/quarter/${quarter}`

            const res = await axios.get(url)
            const root = res.data

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
            const boxUrl = `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`
            const pbpUrl = `https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`

            const [boxRes, pbpRes] = await Promise.all([
                axios.get(boxUrl),
                axios.get(pbpUrl)
            ])

            game = boxRes.data?.game || {}
            plays = pbpRes.data?.game?.actions || []

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

        return {
            title: aiRecap?.title || '',
            storyline: aiRecap?.storyline || [],
            insight: aiRecap?.insight || null,
            runs: aiRecap?.runs || null,
            clutch: aiRecap?.clutch || null,
            quarters: aiRecap?.quarters || [],

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