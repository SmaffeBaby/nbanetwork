import { computed, type Ref } from 'vue'
import { teamsFullNames } from '../constants/TeamFullName'
import { teamStyles } from '../constants/TeamColorsAndBackground'

export function usePlayerPage(player: Ref<any>) {

    const teamFullName = computed(() =>
        player.value?.TEAM_ABBREVIATION
            ? teamsFullNames[player.value.TEAM_ABBREVIATION]
            : ''
    )

    const teamStyle = computed(() =>
        player.value?.TEAM_ABBREVIATION
            ? teamStyles[player.value.TEAM_ABBREVIATION]
            : null
    )

    const playerGradient = computed(() => {
        if (!teamStyle.value) {
            return 'linear-gradient(to right, #1E3A8A, #8B5CF6)'
        }

        return `linear-gradient(
      to right,
      ${teamStyle.value.bgColorHex},
      ${teamStyle.value.bgColorHex}AA
    )`
    })

    const cardStyle = computed(() => {
        if (!teamStyle.value) {
            return { backgroundColor: '#1E3A8A' }
        }

        if (teamStyle.value.bgSvg) {
            return {
                backgroundImage: `
          linear-gradient(to top, rgba(0,0,0,0.7), transparent),
          linear-gradient(${teamStyle.value.bgColorHex}88, ${teamStyle.value.bgColorHex}88),
          url(${teamStyle.value.bgSvg})
        `,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }
        }

        return {
            background: `
        linear-gradient(to top, rgba(0,0,0,0.7), transparent),
        ${teamStyle.value.bgColorHex}
      `
        }
    })

    return {
        teamFullName,
        teamStyle,
        playerGradient,
        cardStyle,
    }
}