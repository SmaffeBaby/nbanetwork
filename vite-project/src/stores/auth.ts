import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { isRealtimeEnabled } from '../lib/realtime'
import { authFetch } from '../api/authFetch'
import { clearAccessToken, setAccessToken } from '../api/authToken'

export type AppUser = {
    id: string
    email: string
    firstName: string
    lastName: string
    avatarImg: string | null
    hideScores: boolean
    favoriteTeams: string[]
    favoritePlayers: FavoritePlayer[]
    favoriteGames: FavoriteGame[]
    watchedGames: FavoriteGame[]
    followingProfiles: string[]
    notifyFollowedComments: boolean
    notifications: UserNotification[]
    isAdmin: boolean
    createdAt: string | null
}

export type FavoritePlayer = {
    id: number
    name: string
    teamAbbr: string
}

export type FavoriteGame = {
    id: string
    date: string | null
    homeName: string
    homeAbbr: string
    homeScore: number | null
    awayName: string
    awayAbbr: string
    awayScore: number | null
}

export type UserNotification = {
    id: string
    userId: string
    userName: string
    avatarImg: string | null
    gameId: string
    gameLabel: string
    commentCreatedAt: string
    createdAt: string
    read: boolean
}

type CachedUser = AppUser & {
    cachedAt: number
}

const CACHE_KEY = 'auth_user_cache'
const CACHE_TTL = 1000 * 60 * 10

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
    return Promise.race([
        promise,
        new Promise<void>((resolve) => {
            setTimeout(resolve, ms)
        }),
    ])
}

export const useAuthStore = defineStore('auth', () => {
    const user = ref<AppUser | null>(null)
    const loading = ref(true)

    let profileChannel: ReturnType<typeof supabase.channel> | null = null
    let authSubscription: { data: { subscription: { unsubscribe: () => void } } } | null = null
    let initPromise: Promise<void> | null = null

    const saveToCache = (userData: AppUser) => {
        const cached: CachedUser = { ...userData, cachedAt: Date.now() }
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
    }

    const getFromCache = (): AppUser | null => {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return null

        try {
            const cached: CachedUser = JSON.parse(raw)

            if (Date.now() - cached.cachedAt > CACHE_TTL) {
                localStorage.removeItem(CACHE_KEY)
                return null
            }

            return {
                id: cached.id,
                email: cached.email,
                firstName: cached.firstName,
                lastName: cached.lastName,
                avatarImg: cached.avatarImg ?? null,
                hideScores: cached.hideScores ?? true,
                favoriteTeams: cached.favoriteTeams ?? [],
                favoritePlayers: cached.favoritePlayers ?? [],
                favoriteGames: cached.favoriteGames ?? [],
                watchedGames: cached.watchedGames ?? [],
                followingProfiles: cached.followingProfiles ?? [],
                notifyFollowedComments: cached.notifyFollowedComments ?? false,
                notifications: cached.notifications ?? [],
                isAdmin: cached.isAdmin ?? false,
                createdAt: cached.createdAt ?? null
            }
        } catch {
            localStorage.removeItem(CACHE_KEY)
            return null
        }
    }

    const clearCache = () => {
        localStorage.removeItem(CACHE_KEY)
    }

    const fetchProfile = async (userId: string, email: string): Promise<AppUser> => {
        const [{ data, error }, followingProfiles] = await Promise.all([
            supabase
            .from('profiles')
            .select('first_name, last_name, avatar_img, hide_scores, favorites_teams, favorites_players, favorites_games, watched_games, notify_followed_comments, notifications, admin, created_at')
            .eq('id', userId)
            .single(),
            fetchFollowingProfiles(userId)
        ])

        if (error || !data) {
            return {
                id: userId,
                email,
                firstName: '',
                lastName: '',
                avatarImg: null,
                hideScores: true,
                favoriteTeams: [],
                favoritePlayers: [],
                favoriteGames: [],
                watchedGames: [],
                followingProfiles: [],
                notifyFollowedComments: false,
                notifications: [],
                isAdmin: false,
                createdAt: null
            }
        }

        return {
            id: userId,
            email,
            firstName: data.first_name,
            lastName: data.last_name,
            avatarImg: data.avatar_img ?? null,
            hideScores: data.hide_scores ?? true,
            favoriteTeams: Array.isArray(data.favorites_teams) ? data.favorites_teams : [],
            favoritePlayers: normalizeFavoritePlayers(data.favorites_players),
            favoriteGames: normalizeFavoriteGames(data.favorites_games),
            watchedGames: normalizeFavoriteGames(data.watched_games),
            followingProfiles,
            notifyFollowedComments: data.notify_followed_comments ?? false,
            notifications: normalizeNotifications(data.notifications),
            isAdmin: data.admin ?? false,
            createdAt: data.created_at ?? null
        }
    }

    const unsubscribeProfile = async () => {
        if (profileChannel) {
            await supabase.removeChannel(profileChannel)
            profileChannel = null
        }
    }

    const subscribeToProfile = async (userId: string) => {
        if (!isRealtimeEnabled()) return

        await unsubscribeProfile()

        profileChannel = supabase
            .channel('profile-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`
                },
                (payload) => {
                    const updated = payload.new as {
                        first_name?: string
                        last_name?: string
                        avatar_img?: string | null
                        hide_scores?: boolean
                        favorites_teams?: string[]
                        favorites_players?: FavoritePlayer[]
                        favorites_games?: FavoriteGame[]
                        watched_games?: FavoriteGame[]
                        notify_followed_comments?: boolean
                        notifications?: UserNotification[]
                        admin?: boolean
                        created_at?: string
                        email?: string
                    }
                    if (!user.value) return

                    user.value = {
                        ...user.value,
                        firstName: updated.first_name ?? user.value.firstName,
                        lastName: updated.last_name ?? user.value.lastName,
                        avatarImg: updated.avatar_img ?? user.value.avatarImg,
                        hideScores: updated.hide_scores ?? user.value.hideScores,
                        favoriteTeams: updated.favorites_teams ?? user.value.favoriteTeams,
                        favoritePlayers: updated.favorites_players
                            ? normalizeFavoritePlayers(updated.favorites_players)
                            : user.value.favoritePlayers,
                        favoriteGames: updated.favorites_games
                            ? normalizeFavoriteGames(updated.favorites_games)
                            : user.value.favoriteGames,
                        watchedGames: updated.watched_games
                            ? normalizeFavoriteGames(updated.watched_games)
                            : user.value.watchedGames,
                        followingProfiles: user.value.followingProfiles,
                        notifyFollowedComments: updated.notify_followed_comments ?? user.value.notifyFollowedComments,
                        notifications: updated.notifications
                            ? normalizeNotifications(updated.notifications)
                            : user.value.notifications,
                        isAdmin: updated.admin ?? user.value.isAdmin,
                        createdAt: updated.created_at ?? user.value.createdAt,
                        email: updated.email ?? user.value.email
                    }
                    saveToCache(user.value)
                }
            )
            .subscribe()
    }

    const runInit = async () => {
        loading.value = true

        const cached = getFromCache()
        if (cached) user.value = cached

        const { data } = await supabase.auth.getSession()
        const session = data.session
        setAccessToken(session?.access_token)

        if (!session?.user) {
            user.value = null
            clearAccessToken()
            clearCache()
            loading.value = false
            return
        }

        const userId = session.user.id
        const email = session.user.email ?? ''

        await subscribeToProfile(userId)

        const fresh = await fetchProfile(userId, email)
        user.value = fresh
        saveToCache(fresh)

        loading.value = false
    }

    const init = async () => {
        if (initPromise) return initPromise

        initPromise = runInit().finally(() => {
            initPromise = null
        })

        return initPromise
    }

    const updateHideScores = async (value: boolean) => {
        if (!user.value) return

        const { data, error } = await supabase
            .from('profiles')
            .update({ hide_scores: value })
            .eq('id', user.value.id)
            .select()

        if (error) {
            console.error('update hide_scores error:', error)
            return
        }

        if (!data || data.length === 0) {
            console.warn('update не применился (возможно RLS)')
            return
        }

        user.value.hideScores = value
        saveToCache(user.value)
    }

    const updateFavoriteTeams = async (teams: string[]) => {
        if (!user.value) return

        const normalized = Array.from(
            new Set(teams.map(team => team.trim().toUpperCase()).filter(Boolean))
        )
        const previous = user.value.favoriteTeams

        user.value.favoriteTeams = normalized
        saveToCache(user.value)

        const { data, error } = await supabase
            .from('profiles')
            .update({ favorites_teams: normalized })
            .eq('id', user.value.id)
            .select()

        if (error || !data || data.length === 0) {
            console.error('update favorites_teams error:', error)
            user.value.favoriteTeams = previous
            saveToCache(user.value)
        }
    }

    const toggleFavoriteTeam = async (teamAbbr: string) => {
        if (!user.value) return

        const normalized = teamAbbr.trim().toUpperCase()
        if (!normalized) return

        const favoriteTeams = user.value.favoriteTeams.includes(normalized)
            ? user.value.favoriteTeams.filter(team => team !== normalized)
            : [...user.value.favoriteTeams, normalized]

        await updateFavoriteTeams(favoriteTeams)
    }

    const updateFavoritePlayers = async (players: FavoritePlayer[]) => {
        if (!user.value) return

        const normalized = normalizeFavoritePlayers(players)
        const previous = user.value.favoritePlayers

        user.value.favoritePlayers = normalized
        saveToCache(user.value)

        const { data, error } = await supabase
            .from('profiles')
            .update({ favorites_players: normalized })
            .eq('id', user.value.id)
            .select()

        if (error || !data || data.length === 0) {
            console.error('update favorites_players error:', error)
            user.value.favoritePlayers = previous
            saveToCache(user.value)
        }
    }

    const toggleFavoritePlayer = async (player: FavoritePlayer) => {
        if (!user.value) return

        const normalized = normalizeFavoritePlayer(player)
        if (!normalized) return

        const favoritePlayers = user.value.favoritePlayers.some(item => item.id === normalized.id)
            ? user.value.favoritePlayers.filter(item => item.id !== normalized.id)
            : [...user.value.favoritePlayers, normalized]

        await updateFavoritePlayers(favoritePlayers)
    }

    const updateFavoriteGames = async (games: FavoriteGame[]) => {
        if (!user.value) return

        const normalized = normalizeFavoriteGames(games)
        const previous = user.value.favoriteGames

        user.value.favoriteGames = normalized
        saveToCache(user.value)

        const { data, error } = await supabase
            .from('profiles')
            .update({ favorites_games: normalized })
            .eq('id', user.value.id)
            .select()

        if (error || !data || data.length === 0) {
            console.error('update favorites_games error:', error)
            user.value.favoriteGames = previous
            saveToCache(user.value)
        }
    }

    const toggleFavoriteGame = async (game: FavoriteGame) => {
        if (!user.value) return

        const normalized = normalizeFavoriteGame(game)
        if (!normalized) return

        const favoriteGames = user.value.favoriteGames.some(item => item.id === normalized.id)
            ? user.value.favoriteGames.filter(item => item.id !== normalized.id)
            : [...user.value.favoriteGames, normalized]

        await updateFavoriteGames(favoriteGames)
    }

    const updateWatchedGames = async (games: FavoriteGame[]) => {
        if (!user.value) return

        const normalized = normalizeFavoriteGames(games)
        const previous = user.value.watchedGames

        user.value.watchedGames = normalized
        saveToCache(user.value)

        const { data, error } = await supabase
            .from('profiles')
            .update({ watched_games: normalized })
            .eq('id', user.value.id)
            .select()

        if (error || !data || data.length === 0) {
            console.error('update watched_games error:', error)
            user.value.watchedGames = previous
            saveToCache(user.value)
        }
    }

    const toggleWatchedGame = async (game: FavoriteGame) => {
        if (!user.value) return

        const normalized = normalizeFavoriteGame(game)
        if (!normalized) return

        const watchedGames = user.value.watchedGames.some(item => item.id === normalized.id)
            ? user.value.watchedGames.filter(item => item.id !== normalized.id)
            : [...user.value.watchedGames, normalized]

        await updateWatchedGames(watchedGames)
    }

    const updateFollowingProfiles = async (profiles: string[]) => {
        if (!user.value) return

        const userId = user.value.id
        const normalized = Array.from(new Set(profiles.map(id => id.trim()).filter(Boolean)))
        const previous = user.value.followingProfiles

        user.value.followingProfiles = normalized
        saveToCache(user.value)

        const removed = previous.filter(id => !normalized.includes(id))
        const added = normalized.filter(id => !previous.includes(id))

        try {
            await Promise.all([
                ...removed.map(id => authFetch(`/api/profile-follows/${id}`, { method: 'DELETE' })),
                ...added.map(id => authFetch(`/api/profile-follows/${id}`, { method: 'POST' }))
            ])
        } catch (error) {
            console.error('update profile_follows error:', error)
            user.value.followingProfiles = previous
            saveToCache(user.value)
            return
        }

        const fresh = await fetchFollowingProfiles(userId)
        if (!user.value || user.value.id !== userId) return

        user.value.followingProfiles = fresh
        saveToCache(user.value)
    }

    const toggleFollowProfile = async (profileId: string) => {
        if (!user.value || !profileId || profileId === user.value.id) return

        const followingProfiles = user.value.followingProfiles.includes(profileId)
            ? user.value.followingProfiles.filter(id => id !== profileId)
            : [...user.value.followingProfiles, profileId]

        await updateFollowingProfiles(followingProfiles)
    }

    const updateNotifyFollowedComments = async (value: boolean) => {
        if (!user.value) return

        const previous = user.value.notifyFollowedComments

        user.value.notifyFollowedComments = value
        saveToCache(user.value)

        const { data, error } = await supabase
            .from('profiles')
            .update({ notify_followed_comments: value })
            .eq('id', user.value.id)
            .select()

        if (error || !data || data.length === 0) {
            console.error('update notify_followed_comments error:', error)
            user.value.notifyFollowedComments = previous
            saveToCache(user.value)
        }
    }

    const updateNotifications = async (notifications: UserNotification[]) => {
        if (!user.value) return

        const normalized = normalizeNotifications(notifications).slice(0, 50)
        const previous = user.value.notifications

        user.value.notifications = normalized
        saveToCache(user.value)

        const { data, error } = await supabase
            .from('profiles')
            .update({ notifications: normalized })
            .eq('id', user.value.id)
            .select()

        if (error || !data || data.length === 0) {
            console.error('update notifications error:', error)
            user.value.notifications = previous
            saveToCache(user.value)
        }
    }

    const addNotification = async (notification: UserNotification) => {
        if (!user.value) return

        const notifications = [
            notification,
            ...user.value.notifications.filter(item => item.id !== notification.id)
        ]

        await updateNotifications(notifications)
    }

    const markNotificationsRead = async () => {
        if (!user.value || user.value.notifications.every(notification => notification.read)) return

        await updateNotifications(
            user.value.notifications.map(notification => ({ ...notification, read: true }))
        )
    }

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setAccessToken(data.session?.access_token)

        const fresh = await fetchProfile(data.user.id, data.user.email ?? '')

        user.value = fresh
        saveToCache(fresh)
        await subscribeToProfile(data.user.id)
    }

    const signUp = async (data: {
        email: string
        password: string
        firstName: string
        lastName: string
    }) => {
        const { data: authData, error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password
        })
        if (error) throw error
        if (!authData.user) throw new Error('No user')
        setAccessToken(authData.session?.access_token)

        await supabase.from('profiles').insert({
            id: authData.user.id,
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName,
            avatar_img: null,
            hide_scores: true,
            favorites_teams: [],
            favorites_players: [],
            favorites_games: [],
            watched_games: [],
            following_profiles: [],
            notify_followed_comments: false,
            notifications: [],
            admin: false
        })

        const newUser: AppUser = {
            id: authData.user.id,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            avatarImg: null,
            hideScores: true,
            favoriteTeams: [],
            favoritePlayers: [],
            favoriteGames: [],
            watchedGames: [],
            followingProfiles: [],
            notifyFollowedComments: false,
            notifications: [],
            isAdmin: false,
            createdAt: new Date().toISOString()
        }

        user.value = newUser
        saveToCache(newUser)
        await subscribeToProfile(authData.user.id)
    }

    const logout = async () => {
        try {
            await withTimeout(supabase.auth.signOut(), 2500)
        } catch (e) {
            console.error('signOut:', e)
        }
        try {
            await withTimeout(unsubscribeProfile(), 1500)
        } catch {
        }
        clearCache()
        clearAccessToken()
        user.value = null
        loading.value = false
    }

    const subscribeAuthState = () => {
        if (authSubscription) return

        authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setAccessToken(session.access_token)
                const fresh = await fetchProfile(session.user.id, session.user.email ?? '')
                user.value = fresh
                saveToCache(fresh)
                await subscribeToProfile(session.user.id)
            } else if (event === 'SIGNED_OUT') {
                await unsubscribeProfile()
                clearAccessToken()
                clearCache()
                user.value = null
            }
        })
    }

    return {
        user,
        loading,
        init,
        signIn,
        signUp,
        logout,
        subscribeAuthState,
        updateHideScores,
        updateFavoriteTeams,
        toggleFavoriteTeam,
        updateFavoritePlayers,
        toggleFavoritePlayer,
        updateFavoriteGames,
        toggleFavoriteGame,
        updateWatchedGames,
        toggleWatchedGame,
        updateFollowingProfiles,
        toggleFollowProfile,
        updateNotifyFollowedComments,
        updateNotifications,
        addNotification,
        markNotificationsRead
    }
})

function normalizeFavoritePlayers(value: unknown): FavoritePlayer[] {
    if (!Array.isArray(value)) return []

    const byId = new Map<number, FavoritePlayer>()

    value.forEach((player) => {
        const normalized = normalizeFavoritePlayer(player)
        if (normalized) byId.set(normalized.id, normalized)
    })

    return [...byId.values()]
}

async function fetchFollowingProfiles(userId: string): Promise<string[]> {
    try {
        const data = await authFetch('/api/profile-follows')
        return (data.follows ?? [])
            .map((row: { following_id?: string }) => row.following_id)
            .filter(Boolean)
    } catch (error) {
        console.error('fetch profile_follows error:', error)
        return []
    }
}

function normalizeFavoritePlayer(value: unknown): FavoritePlayer | null {
    if (!value || typeof value !== 'object') return null

    const raw = value as Partial<FavoritePlayer>
    const id = Number(raw.id)
    const name = String(raw.name ?? '').trim()
    const teamAbbr = String(raw.teamAbbr ?? '').trim().toUpperCase()

    if (!Number.isFinite(id) || !name) return null

    return { id, name, teamAbbr }
}

function normalizeFavoriteGames(value: unknown): FavoriteGame[] {
    if (!Array.isArray(value)) return []

    const byId = new Map<string, FavoriteGame>()

    value.forEach((game) => {
        const normalized = normalizeFavoriteGame(game)
        if (normalized) byId.set(normalized.id, normalized)
    })

    return [...byId.values()]
}

function normalizeFavoriteGame(value: unknown): FavoriteGame | null {
    if (!value || typeof value !== 'object') return null

    const raw = value as Partial<FavoriteGame>
    const id = String(raw.id ?? '').trim()

    if (!id) return null

    return {
        id,
        date: raw.date ? String(raw.date) : null,
        homeName: String(raw.homeName ?? ''),
        homeAbbr: String(raw.homeAbbr ?? '').trim().toUpperCase(),
        homeScore: raw.homeScore == null ? null : Number(raw.homeScore),
        awayName: String(raw.awayName ?? ''),
        awayAbbr: String(raw.awayAbbr ?? '').trim().toUpperCase(),
        awayScore: raw.awayScore == null ? null : Number(raw.awayScore)
    }
}

function normalizeNotifications(value: unknown): UserNotification[] {
    if (!Array.isArray(value)) return []

    return value
        .map((item) => normalizeNotification(item))
        .filter((item): item is UserNotification => Boolean(item))
}

function normalizeNotification(value: unknown): UserNotification | null {
    if (!value || typeof value !== 'object') return null

    const raw = value as Partial<UserNotification>
    const id = String(raw.id ?? '').trim()
    const userId = String(raw.userId ?? '').trim()
    const gameId = String(raw.gameId ?? '').trim()

    if (!id || !userId || !gameId) return null

    return {
        id,
        userId,
        userName: String(raw.userName ?? 'Пользователь'),
        avatarImg: raw.avatarImg ?? null,
        gameId,
        gameLabel: String(raw.gameLabel ?? `Матч ${gameId}`),
        commentCreatedAt: String(raw.commentCreatedAt ?? new Date().toISOString()),
        createdAt: String(raw.createdAt ?? new Date().toISOString()),
        read: Boolean(raw.read)
    }
}
