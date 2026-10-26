import { usePageTitle } from '../../usePageTitle'
import { normalizeFavoriteGames } from '../../../api/gameIdentity'
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useProfileFollows } from '../../Profile/useProfileFollows'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/auth'
import type { FavoriteGame, FavoritePlayer } from '../../../stores/auth'

export type PublicProfile = {
    id: string
    first_name: string
    last_name: string
    avatar_img: string | null
    favorites_teams: string[] | null
    favorites_players: FavoritePlayer[] | null
    favorites_games: FavoriteGame[] | null
    watched_games: FavoriteGame[] | null
    telegram_url: string | null
    instagram_url: string | null
    created_at: string
}

export const usePublicProfile = () => {
    const route = useRoute()
    const router = useRouter()
    const auth = useAuthStore()

    const isOwnProfile = computed(() => String(route.params.id ?? '') === auth.user?.id)
    const userId = computed(() => String(route.params.id ?? ''))
    const profileQuery = useQuery({
        queryKey: computed(() => ['public-profile', userId.value, auth.user?.id ?? '']),
        enabled: computed(() => Boolean(userId.value && auth.user?.id && !auth.loading)),
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        queryFn: async ({ queryKey: [, id], signal }): Promise<PublicProfile> => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, avatar_img, telegram_url, instagram_url, favorites_teams, favorites_players, favorites_games, watched_games, created_at')
                .eq('id', id)
                .abortSignal(AbortSignal.any([signal, AbortSignal.timeout(10000)]))
                .maybeSingle()
            if (error) throw new Error('Не удалось загрузить профиль. Попробуйте ещё раз.')
            if (!data) throw new Error('Профиль не найден')
            return data as PublicProfile
        }
    })
    const profile = computed(() => auth.user ? profileQuery.data.value ?? null : null)
    const loading = computed(() => auth.loading || Boolean(auth.user && profileQuery.isPending.value))
    const error = computed(() => !auth.loading && !auth.user
        ? 'Войдите в аккаунт, чтобы посмотреть профиль.'
        : profileQuery.error.value?.message ?? null)
    const follows = useProfileFollows()
    const followPending = computed(() => follows.pending.value.includes(userId.value))
    const followError = follows.error

    const fullName = computed(() => {
        const name = `${profile.value?.first_name ?? ''} ${profile.value?.last_name ?? ''}`.trim()
        return name || 'Пользователь'
    })

    usePageTitle(() => profile.value ? `${fullName.value} — Профиль` : null)

    const initials = computed(() => {
        const first = profile.value?.first_name?.trim().charAt(0) ?? ''
        const last = profile.value?.last_name?.trim().charAt(0) ?? ''
        return `${first}${last}`.trim() || 'U'
    })

    const registeredSince = computed(() => {
        if (!profile.value?.created_at) return ''

        const date = new Intl.DateTimeFormat('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(new Date(profile.value.created_at))

        return `с ${date}`
    })

    const sortGamesByDate = (games: FavoriteGame[]) => {
        return [...games].sort((a, b) => {
            const firstDate = new Date(b.date ?? '').getTime()
            const secondDate = new Date(a.date ?? '').getTime()

            return firstDate - secondDate
        })
    }

    const favoriteGames = computed(() =>
        sortGamesByDate(normalizeFavoriteGames(isOwnProfile.value ? auth.user?.favoriteGames : profile.value?.favorites_games))
    )

    const watchedGames = computed(() =>
        sortGamesByDate(normalizeFavoriteGames(isOwnProfile.value ? auth.user?.watchedGames : profile.value?.watched_games))
    )

    const canFollow = computed(() =>
        Boolean(auth.user && profile.value && auth.user.id !== profile.value.id)
    )

    const isFollowing = computed(() =>
        Boolean(profile.value && auth.user?.followingProfiles?.includes(profile.value.id))
    )

    const goToTeam = (abbr: string) => {
        router.push({ name: 'TeamDetail', params: { abbr } })
    }

    const goToPlayer = (name: string) => {
        router.push(`/player/${encodeURIComponent(name)}`)
    }

    const toggleFollow = async () => {
        if (!profile.value) return
        await follows.setFollowing(profile.value.id, !isFollowing.value)
    }

    return {
        profile,
        retryProfile: () => profileQuery.refetch(),
        followPending,
        followError,
        loading,
        error,
        fullName,
        initials,
        registeredSince,
        favoriteGames,
        watchedGames,
        canFollow,
        isFollowing,
        goToTeam,
        goToPlayer,
        toggleFollow
    }
}