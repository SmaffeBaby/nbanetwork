import { computed } from 'vue'
import type { Ref } from 'vue'
import { getPlayerImage } from '../../../utils/playerImage.ts'
import { teamStyles } from '../../../constants/TeamColorsAndBackground.ts'

type Player = {
    PLAYER_ID: number
    PLAYER_NAME: string
    TEAM_ABBREVIATION: string
    PTS: number
    REB: number
    AST: number
    STL: number
    BLK: number
    TOV: number
}

type StatKey = keyof Pick<Player, 'PTS' | 'REB' | 'AST' | 'STL' | 'BLK' | 'TOV'>

type TeamStyle = {
    bgColorHex: string
    bgSvg?: string
}

export function usePlayerPage(player: Ref<Player | undefined>) {

    const teamFullName = computed(() => {
        if (!player.value || !player.value.TEAM_ABBREVIATION) return ''
        return player.value.TEAM_ABBREVIATION
    })

    const teamStyle = computed<TeamStyle | null>(() => {
        if (!player.value) return null
        return teamStyles[player.value.TEAM_ABBREVIATION] || { bgColorHex: '#333333' }
    })

    function hexToRgba(hex: string, alpha: number) {
        const r = parseInt(hex.slice(1,3),16)
        const g = parseInt(hex.slice(3,5),16)
        const b = parseInt(hex.slice(5,7),16)
        return `rgba(${r},${g},${b},${alpha})`
    }

    const cardStyle = computed(() => {
        const bgColor = teamStyle.value?.bgColorHex || '#333333'
        const bgSvgUrl = teamStyle.value?.bgSvg || ''

        const colorOverlay = `linear-gradient(${hexToRgba(bgColor, 0.4)}, ${hexToRgba(bgColor, 0.4)})`

        const blackGradient = 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 60%)'

        const layers: string[] = [blackGradient, colorOverlay]
        if (bgSvgUrl) layers.push(`url(${bgSvgUrl})`)

        return {
            backgroundColor: bgColor,
            backgroundImage: layers.join(', '),
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backdropFilter: 'blur(12px)',
        }
    })

    const hasTeam = computed(() => !!teamFullName.value && !!teamStyle.value)

    const stats: { label: string; key: StatKey }[] = [
        { label: 'PPG', key: 'PTS' },
        { label: 'RPG', key: 'REB' },
        { label: 'APG', key: 'AST' },
        { label: 'SPG', key: 'STL' },
        { label: 'BPG', key: 'BLK' },
        { label: 'TOV', key: 'TOV' },
    ]

    return { teamFullName, teamStyle, cardStyle, hasTeam, stats }
}