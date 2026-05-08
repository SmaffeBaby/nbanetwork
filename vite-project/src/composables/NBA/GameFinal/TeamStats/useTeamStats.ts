import { computed, type Ref } from 'vue'
import { teamStyles } from '../../../../constants/TeamColorsAndBackground'

const fallbackAwayColor = '#ef174f'
const fallbackHomeColor = '#24488f'

const n = (value: any) => Number(value ?? 0)

export function useTeamStats(recap: Ref<any>) {
    const meta = computed(() => recap.value?.meta || {})

    const playersRaw = computed(() => [
        ...(recap.value?.players?.away || []).map((p: any) => ({ ...p, side: 'away' })),
        ...(recap.value?.players?.home || []).map((p: any) => ({ ...p, side: 'home' }))
    ])

    const awayAbbr = computed(() => meta.value.awayAbbr || 'AWY')
    const homeAbbr = computed(() => meta.value.homeAbbr || 'HOME')
    const awayName = computed(() => meta.value.awayTeam || awayAbbr.value)
    const homeName = computed(() => meta.value.homeTeam || homeAbbr.value)
    const awayColor = computed(() => teamStyles[awayAbbr.value]?.bgColorHex || fallbackAwayColor)
    const homeColor = computed(() => teamStyles[homeAbbr.value]?.bgColorHex || fallbackHomeColor)

    const normalizedPlayers = computed(() => playersRaw.value
        .filter((p: any) => !['INACTIVE_INJURY', 'DND_INJURY', 'DNP'].includes(p.notPlayingReason))
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
                side: p.side,
                points: n(s.points ?? s.pts),
                rebounds: n(s.reboundsTotal ?? s.rebounds ?? s.reb),
                assists: n(s.assists ?? s.ast),
                steals: n(s.steals ?? s.stl),
                blocks: n(s.blocks ?? s.blk),
                turnovers: n(s.turnovers ?? s.tov),
                fgM,
                fgA,
                tpM,
                tpA,
                ftM,
                ftA
            }
        })
        .filter((p: any) => p.name && p.PLAYER_ID)
    )

    const teamStats = computed(() => {
        const apiStats = meta.value.teamStats

        const sumSide = (side: string) => {
            const sidePlayers = normalizedPlayers.value.filter((p: any) => p.side === side)
            const sum = (key: string) => sidePlayers.reduce((acc: number, p: any) => acc + n(p[key]), 0)
            const apiSide = side === 'home' ? apiStats?.home : apiStats?.away
            const pct = (made: number, attempted: number) => attempted ? +(made / attempted * 100).toFixed(1) : 0

            return {
                points: side === 'home' ? n(meta.value.homeScore) : n(meta.value.awayScore),
                rebounds: sum('rebounds'),
                assists: sum('assists'),
                steals: sum('steals'),
                blocks: sum('blocks'),
                turnovers: sum('turnovers'),
                fgPct: pct(sum('fgM'), sum('fgA')),
                tpPct: pct(sum('tpM'), sum('tpA')),
                ftPct: pct(sum('ftM'), sum('ftA')),
                pointsInThePaint: n(apiSide?.pointsInThePaint),
                secondChancePoints: n(apiSide?.secondChancePoints),
                fastBreakPoints: n(apiSide?.fastBreakPoints)
            }
        }

        return {
            away: sumSide('away'),
            home: sumSide('home')
        }
    })

    const buildComparisonRow = (key: string, label: string) => {
        const awayStats: any = teamStats.value.away
        const homeStats: any = teamStats.value.home
        const away = n(awayStats?.[key])
        const home = n(homeStats?.[key])
        const total = Math.max(away + home, 1)
        const max = Math.max(away, home, 1)

        return {
            key,
            label,
            away,
            home,
            awayPct: Math.max(2, away / max * 100),
            homePct: Math.max(2, home / max * 100),
            awayShare: away / total * 100,
            homeShare: home / total * 100
        }
    }

    const comparisonRows = computed(() => [
        ['points', 'PTS'],
        ['rebounds', 'REB'],
        ['assists', 'AST'],
        ['steals', 'STL'],
        ['blocks', 'BLK'],
        ['turnovers', 'TO'],
        ['fgPct', 'FG%'],
        ['tpPct', '3P%'],
        ['ftPct', 'FT%']
    ].map(([key, label]) => buildComparisonRow(key, label)))

    const specialRows = computed(() => [
        ['pointsInThePaint', 'PTS in the paint'],
        ['secondChancePoints', '2nd chance pts'],
        ['fastBreakPoints', 'Fastbreak pts']
    ].map(([key, label]) => buildComparisonRow(key, label)))

    const statLeaders = [
        { key: 'points', label: 'PTS', title: 'Scoring leader' },
        { key: 'rebounds', label: 'REB', title: 'Glass work' },
        { key: 'assists', label: 'AST', title: 'Playmaking' },
        { key: 'blocks', label: 'BLK', title: 'Rim protection' }
    ]

    const leaderRows = computed(() => {
        return statLeaders.map((stat) => {
            const leaders = ['away', 'home'].map((side) => {
                const player: any = normalizedPlayers.value
                    .filter((p: any) => p.side === side)
                    .sort((a: any, b: any) => n(b[stat.key]) - n(a[stat.key]))[0]

                if (!player) return null

                return {
                    key: `${side}-${stat.key}`,
                    side,
                    abbr: side === 'away' ? awayAbbr.value : homeAbbr.value,
                    player,
                    value: n(player[stat.key]),
                    color: side === 'away' ? awayColor.value : homeColor.value
                }
            }).filter(Boolean) as any[]

            const max = Math.max(...leaders.map((leader) => leader.value), 1)

            return {
                key: stat.key,
                label: stat.label,
                title: stat.title,
                leaders: leaders.map((leader) => ({
                    ...leader,
                    percent: Math.max(5, leader.value / max * 100)
                }))
            }
        }).filter((row) => row.leaders.length)
    })

    const leadPoints = computed(() => meta.value.leadTracker?.points || [])
    const leadSummary = computed(() => ({
        awayLead: n(meta.value.leadTracker?.summary?.biggestAwayLead),
        homeLead: n(meta.value.leadTracker?.summary?.biggestHomeLead),
        timesTied: n(meta.value.leadTracker?.summary?.timesTied),
        leadChanges: n(meta.value.leadTracker?.summary?.leadChanges),
        longestRun: n(meta.value.leadTracker?.summary?.longestRun)
    }))

    const chartWidth = 1060
    const chartHeight = 430
    const chartPad = { left: 54, right: 18, top: 34, bottom: 38 }
    const maxLead = computed(() => Math.max(5, ...leadPoints.value.map((p: any) => Math.abs(n(p.diff)))))
    const maxElapsed = computed(() => Math.max(2880, ...leadPoints.value.map((p: any) => n(p.elapsed))))
    const yTicks = computed(() => {
        const step = maxLead.value > 30 ? 10 : 5
        const ticks = []
        for (let tick = -Math.ceil(maxLead.value / step) * step; tick <= maxLead.value; tick += step) {
            ticks.push(tick)
        }
        return ticks
    })

    const xScale = (elapsed: number) => chartPad.left + elapsed / maxElapsed.value * (chartWidth - chartPad.left - chartPad.right)
    const yScale = (diff: number) => chartPad.top + (maxLead.value - diff) / (maxLead.value * 2) * (chartHeight - chartPad.top - chartPad.bottom)

    const leadBars = computed(() => leadPoints.value.map((point: any, index: number) => {
        const next = leadPoints.value[index + 1]
        const x = xScale(n(point.elapsed))
        const nextX = next ? xScale(n(next.elapsed)) : x + 6
        const chartDiff = -n(point.diff)
        const zero = yScale(0)
        const y = yScale(chartDiff)

        return {
            key: `${point.actionNumber}-${index}`,
            x,
            y: Math.min(y, zero),
            width: Math.max(2, nextX - x),
            height: Math.max(2, Math.abs(zero - y)),
            color: chartDiff >= 0 ? awayColor.value : homeColor.value
        }
    }))

    const periodMarkers = computed(() => {
        const labels = ['Q1', 'Q2', 'Q3', 'Q4']
        return labels.map((label, index) => ({
            label,
            x: xScale(index * 720)
        }))
    })

    const formatNumber = (value: number) => {
        const numeric = n(value)
        return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1)
    }

    return {
        awayAbbr,
        homeAbbr,
        awayName,
        homeName,
        awayColor,
        homeColor,
        leaderRows,
        teamStats,
        comparisonRows,
        specialRows,
        leadPoints,
        leadSummary,
        chartWidth,
        chartHeight,
        chartPad,
        yTicks,
        yScale,
        leadBars,
        periodMarkers,
        formatNumber
    }
}
