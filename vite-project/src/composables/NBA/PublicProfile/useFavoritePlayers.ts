import { computed } from 'vue'
import type { Ref } from 'vue'
import type { FavoritePlayer } from '../../../stores/auth'
import { teamStyles } from '../../../constants/TeamColorsAndBackground'

export type PublicFavoritePlayer = FavoritePlayer & {
    bgColor: string
    bgSvg?: string
}

export const useFavoritePlayers = (players: Ref<FavoritePlayer[] | null | undefined>) => {
    const favoritePlayers = computed<PublicFavoritePlayer[]>(() =>
        (players.value ?? []).map(player => ({
            ...player,
            bgColor: teamStyles[player.teamAbbr]?.bgColorHex ?? '#111827',
            bgSvg: teamStyles[player.teamAbbr]?.bgSvg
        }))
    )

    return {
        favoritePlayers
    }
}