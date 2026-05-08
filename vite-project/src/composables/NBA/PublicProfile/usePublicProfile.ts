import { computed, onMounted, ref, watch } from 'vue'
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
    created_at: string
}

export const usePublicProfile = () => {
    const route = useRoute()
    const router = useRouter()
    const auth = useAuthStore()

    const profile = ref<PublicProfile | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    const userId = computed(() => String(route.params.id ?? ''))

    const fullName = computed(() => {
        const name = `${profile.value?.first_name ?? ''} ${profile.value?.last_name ?? ''}`.trim()
        return name || 'Пользователь'
    })

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
        sortGamesByDate(profile.value?.favorites_games ?? [])
    )

    const watchedGames = computed(() =>
        sortGamesByDate(profile.value?.watched_games ?? [])
    )

    const canFollow = computed(() =>
        Boolean(auth.user && profile.value && auth.user.id !== profile.value.id)
    )

    const isFollowing = computed(() =>
        Boolean(profile.value && auth.user?.followingProfiles?.includes(profile.value.id))
    )

    const fetchProfile = async () => {
        if (!userId.value) return

        loading.value = true
        error.value = null

        if (!auth.user) {
            await auth.init()
            auth.subscribeAuthState()
        }

        const { data, error: fetchError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_img, favorites_teams, favorites_players, favorites_games, watched_games, created_at')
            .eq('id', userId.value)
            .single()

        loading.value = false

        if (fetchError || !data) {
            error.value = 'Профиль не найден'
            profile.value = null
            return
        }

        profile.value = data as unknown as PublicProfile
    }

    const goToTeam = (abbr: string) => {
        router.push({ name: 'TeamDetail', params: { abbr } })
    }

    const goToPlayer = (name: string) => {
        router.push(`/player/${encodeURIComponent(name)}`)
    }

    const toggleFollow = async () => {
        if (!profile.value) return
        await auth.toggleFollowProfile(profile.value.id)
    }

    onMounted(fetchProfile)
    watch(userId, fetchProfile)

    return {
        profile,
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