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

function parseMinutes(min: string) {
    if (!min) return 0
    const match = min.match(/PT(\d+)M/)
    return match ? Number(match[1]) : 0
}

export function useGamePlayersStats(recap: Ref<any>) {

    const players = computed<PlayerStats[]>(() => {
        const home = recap.value?.players?.home || []
        const away = recap.value?.players?.away || []
        const excludedReasons = ['INACTIVE_INJURY', 'DND_INJURY']

        const all = [...home, ...away].filter((p: any) => {
            return !excludedReasons.includes(p.notPlayingReason)
        })

        const n = (v: any) => Number(v ?? 0)

        return all.map((p: any) => {
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
                jerseyNum: n(s.jerseyNum ?? p.jerseyNum ?? p.jersey),

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

    return { players }
}