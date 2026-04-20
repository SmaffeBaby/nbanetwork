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

    steals: number
    blocks: number

    fgM: number
    fgA: number
    fgPct: number

    tpM: number
    tpA: number
    tpPct: number

    ftM: number
    ftA: number
    ftPct: number


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
        const isoMatch = min.match(/PT(\d+)M/)
        if (isoMatch) value = Number(isoMatch[1])
    }

    else {
        const num = Number(min)
        value = isNaN(num) ? 0 : num
    }

    return Math.round(value * 10) / 10
}

export function useGamePlayersStats(recap: Ref<any>) {

    const excludedReasons = ['INACTIVE_INJURY', 'DND_INJURY']

    const allRaw = computed(() => {
        const home = recap.value?.players?.home || []
        const away = recap.value?.players?.away || []
        return [...home, ...away]
    })

    const n = (v: any) => Number(v ?? 0)

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

                    points: n(s.points),
                    assists: n(s.assists),
                    rebounds: n(s.reboundsTotal),

                    steals: n(s.steals),
                    blocks: n(s.blocks),

                    fgM,
                    fgA,
                    fgPct: fgA ? +(fgM / fgA * 100).toFixed(1) : 0,

                    tpM,
                    tpA,
                    tpPct: tpA ? +(tpM / tpA * 100).toFixed(1) : 0,

                    ftM,
                    ftA,
                    ftPct: ftA ? +(ftM / ftA * 100).toFixed(1) : 0,

                    fouls: n(s.foulsPersonal),
                    turnovers: n(s.turnovers),
                    plusMinus: n(s.plusMinusPoints)
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