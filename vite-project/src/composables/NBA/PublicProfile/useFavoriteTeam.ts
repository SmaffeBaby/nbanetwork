import { computed } from 'vue'
import type { Ref } from 'vue'
import { teamsFullNames } from '../../../constants/TeamFullName'
import { teamStyles } from '../../../constants/TeamColorsAndBackground'
import { getTeamLogo } from '../../../utils/getTeamLogo'

export type PublicFavoriteTeam = {
    abbr: string
    name: string
    logo: string
    bgColor: string
    bgSvg?: string
}

export const useFavoriteTeam = (teams: Ref<string[] | null | undefined>) => {
    const favoriteTeams = computed<PublicFavoriteTeam[]>(() =>
        (teams.value ?? []).map(abbr => ({
            abbr,
            name: teamsFullNames[abbr] ?? abbr,
            logo: getTeamLogo(abbr),
            bgColor: teamStyles[abbr]?.bgColorHex ?? '#111827',
            bgSvg: teamStyles[abbr]?.bgSvg
        }))
    )

    return {
        favoriteTeams
    }
}