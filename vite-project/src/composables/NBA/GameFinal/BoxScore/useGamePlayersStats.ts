import { computed, type Ref } from 'vue'

export interface PlayerStats {
    name: string
    PLAYER_ID: string
    TEAM_ID: string

    position: string
    jerseyNum: number

    minutes: number

    points: number
    assists: number
    rebounds: number
    offensiveRebounds: number
    defensiveRebounds: number

    steals: number
    blocks: number

    fgM: number
    fgA: number
    fgMiss: number
    fgPct: number

    twoM: number
    twoA: number
    twoPct: number

    tpM: number
    tpA: number
    tpPct: number

    ftM: number
    ftA: number
    ftMiss: number
    ftPct: number

    efgPct: number
    tsPct: number
    gameScore: number

    fouls: number
    turnovers: number
    plusMinus: number
}

function parseMinutes(min: any) {
    if (!min) return 0

    let value = 0

    if (typeof min === 'string' && min.includes(':')) {
        const [m, s] = min.split(':').map(Number)
        value = m + (s / 60)
    }

    else if (typeof min === 'string') {
        const isoMatch = min.match(/PT(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/)
        if (isoMatch) value = Number(isoMatch[1] || 0) + Number(isoMatch[2] || 0) / 60
    }

    else {
        const num = Number(min)
        value = isNaN(num) ? 0 : num
    }

    return Math.round(value * 10) / 10
}

export function useGamePlayersStats(recap: Ref<any>) {

    const excludedReasons = ['INACTIVE_INJURY', 'DND_INJURY', 'DNP']

    const allRaw = computed(() => {
        const home = recap.value?.players?.home || []
        const away = recap.value?.players?.away || []
        return [...home, ...away]
    })

    const n = (v: any) => Number(v ?? 0)
    const firstNumber = (source: any, keys: string[]) => {
        for (const key of keys) {
            const value = source?.[key]

            if (value !== undefined && value !== null && value !== '') {
                return n(value)
            }
        }

        return 0
    }

    const players = computed<PlayerStats[]>(() => {
        return allRaw.value
            .filter((p: any) => !excludedReasons.includes(p.notPlayingReason))
            .map((p: any) => {
                const s = p.statistics || p.stats || {}

                const fgM = n(s.fieldGoalsMade ?? s.fgm)
                const fgA = n(s.fieldGoalsAttempted ?? s.fga)

                const tpM = n(s.threePointersMade ?? s.fg3m)
                const tpA = n(s.threePointersAttempted ?? s.fg3a)

                const ftM = n(s.freeThrowsMade ?? s.ftm)
                const ftA = n(s.freeThrowsAttempted ?? s.fta)
                const twoM = n(s.twoPointersMade ?? s.fg2m ?? Math.max(fgM - tpM, 0))
                const twoA = n(s.twoPointersAttempted ?? s.fg2a ?? Math.max(fgA - tpA, 0))
                const fgMiss = Math.max(fgA - fgM, 0)
                const ftMiss = Math.max(ftA - ftM, 0)
                const points = n(s.points ?? s.pts)
                const offensiveRebounds = firstNumber(s, ['reboundsOffensive', 'offensiveRebounds', 'OREB', 'oreb', 'offReb', 'offensiveReb'])
                const defensiveRebounds = firstNumber(s, ['reboundsDefensive', 'defensiveRebounds', 'DREB', 'dreb', 'defReb', 'defensiveReb'])
                const assists = n(s.assists ?? s.ast)
                const steals = n(s.steals ?? s.stl)
                const blocks = n(s.blocks ?? s.blk)
                const turnovers = n(s.turnovers ?? s.tov)
                const fouls = n(s.foulsPersonal ?? s.personalFouls ?? s.pf)
                const efgPct = fgA ? +((fgM + 0.5 * tpM) / fgA * 100).toFixed(1) : 0
                const tsPct = (fgA + 0.44 * ftA) ? +(points / (2 * (fgA + 0.44 * ftA)) * 100).toFixed(1) : 0
                const gameScore = +(
                    points +
                    0.4 * fgM -
                    0.7 * fgMiss -
                    0.4 * ftMiss +
                    0.7 * offensiveRebounds +
                    0.3 * defensiveRebounds +
                    steals +
                    0.7 * assists +
                    0.7 * blocks -
                    0.4 * fouls -
                    turnovers
                ).toFixed(1)

                return {
                    name: p.name || `${p.firstName || ''} ${p.familyName || ''}`.trim(),
                    PLAYER_ID: String(p.personId || p.playerId || ''),
                    TEAM_ID: String(p.teamId || ''),

                    position: s.position || p.position || '',
                    jerseyNum:
                        s.jerseyNum ??
                        p.jerseyNum ??
                        p.jersey ??
                        null,

                    minutes: parseMinutes(s.minutesCalculated || s.minutes),

                    points,
                    assists,
                    rebounds: n(s.reboundsTotal ?? s.rebounds ?? s.reb) || offensiveRebounds + defensiveRebounds,
                    offensiveRebounds,
                    defensiveRebounds,

                    steals,
                    blocks,

                    fgM,
                    fgA,
                    fgMiss,
                    fgPct: fgA ? +(fgM / fgA * 100).toFixed(1) : 0,

                    twoM,
                    twoA,
                    twoPct: twoA ? +(twoM / twoA * 100).toFixed(1) : 0,

                    tpM,
                    tpA,
                    tpPct: tpA ? +(tpM / tpA * 100).toFixed(1) : 0,

                    ftM,
                    ftA,
                    ftMiss,
                    ftPct: ftA ? +(ftM / ftA * 100).toFixed(1) : 0,

                    efgPct,
                    tsPct,
                    gameScore,

                    fouls,
                    turnovers,
                    plusMinus: n(s.plusMinusPoints ?? s.plusMinus)
                }
            })
    })

    const inactivePlayers = computed(() => {
        return allRaw.value
            .filter((p: any) => excludedReasons.includes(p.notPlayingReason))
            .map((p: any) => ({
                name: p.name || `${p.firstName || ''} ${p.familyName || ''}`.trim(),
                PLAYER_ID: String(p.personId || p.playerId || ''),
                TEAM_ID: String(p.teamId || ''),
                reason: p.notPlayingReason,
                description: p.notPlayingDescription || ''
            }))
    })

    return { players, inactivePlayers }
}
