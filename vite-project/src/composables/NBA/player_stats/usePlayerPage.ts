import { computed } from 'vue'
import type { Ref } from 'vue'
import { teamStyles } from '../../../constants/TeamColorsAndBackground.ts'

type StatKey = 'PTS' | 'REB' | 'AST' | 'STL' | 'BLK' | 'TOV'

type Player = {
    PLAYER_ID: number
    PLAYER_NAME: string
    TEAM_ABBREVIATION: string
} & Partial<Record<StatKey, number>>

type TeamStyle = {
    bgColorHex: string
    bgSvg?: string
}

type Stat = {
    label: string
    key: StatKey
}

export function usePlayerPage(player: Ref<Player | undefined>) {

    const teamAbbr = computed(() => player.value?.TEAM_ABBREVIATION ?? '')

    const teamFullName = computed(() => teamAbbr.value)

    const teamStyle = computed<TeamStyle | null>(() => {
        if (!teamAbbr.value) return null
        return teamStyles[teamAbbr.value] || { bgColorHex: '#333333' }
    })

    function hexToRgba(hex: string, alpha: number) {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)

        return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

    const cardStyle = computed(() => {
        const bgColor = teamStyle.value?.bgColorHex ?? '#333333'
        const bgSvgUrl = teamStyle.value?.bgSvg

        const overlay = `linear-gradient(
      ${hexToRgba(bgColor, 0.45)},
      ${hexToRgba(bgColor, 0.45)}
    )`

        const darkFade =
            'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))'

        const layers: string[] = [darkFade, overlay]

        if (bgSvgUrl) {
            layers.push(`url(${bgSvgUrl})`)
        }

        return {
            backgroundColor: bgColor,
            backgroundImage: layers.join(', '),
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backdropFilter: 'blur(12px)',
        }
    })

    const hasTeam = computed(() => !!teamAbbr.value)

    const stats: Stat[] = [
        { label: 'PPG', key: 'PTS' },
        { label: 'RPG', key: 'REB' },
        { label: 'APG', key: 'AST' },
        { label: 'SPG', key: 'STL' },
        { label: 'BPG', key: 'BLK' },
        { label: 'TOV', key: 'TOV' },
    ]

    return {
        teamFullName,
        teamStyle,
        cardStyle,
        hasTeam,
        stats,
    }
}