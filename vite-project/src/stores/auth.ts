import { normalizeFavoriteGame, normalizeFavoriteGames, sameGame } from '../api/gameIdentity'
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
    source?: 'espn' | 'nba'
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('Превышено время ожидания авторизации.')), ms)
        })
    ]).finally(() => clearTimeout(timer))
}

export const useAuthStore = defineStore('auth', () => {
    const user = ref<AppUser | null>(null)
    const loading = ref(true)

    let profileChannel: ReturnType<typeof supabase.channel> | null = null
    let authSubscription: { data: { subscription: { unsubscribe: () => void } } } | null = null
    let initPromise: Promise<void> | null = null
    let initialized = false
    let authGeneration = 0
    const followingRevision = ref(0)
    const followingPending = ref<string[]>([])
    const followingRequests = new Map<string, Promise<void>>()

    const saveToCache = (userData: AppUser) => {
        const cached: CachedUser = { ...userData, cachedAt: Date.now() }
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(cached)) } catch { /* Storage may be unavailable or full. */ }
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
                favoriteGames: normalizeFavoriteGames(cached.favoriteGames),
                watchedGames: normalizeFavoriteGames(cached.watchedGames),
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
        const revision = followingRevision.value
        const [{ data, error }, followingProfiles] = await Promise.all([
            supabase
            .from('profiles')
            .select('first_name, last_name, avatar_img, hide_scores, favorites_teams, favorites_players, favorites_games, watched_games, notify_followed_comments, notifications, admin, created_at')
            .eq('id', userId)
            .abortSignal(AbortSignal.timeout(10000))
            .single(),
            fetchFollowingProfiles(userId).catch(() => user.value?.id === userId ? user.value.followingProfiles : [])
        ])

        if (error || !data) throw new Error(error?.message || 'Профиль не найден')

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
            followingProfiles: user.value?.id === userId && revision !== followingRevision.value
                ? user.value.followingProfiles : followingProfiles,
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
                    if (user.value?.id !== userId) return

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
                        favoriteGames: !pendingGameWrites && updated.favorites_games
                            ? normalizeFavoriteGames(updated.favorites_games)
                            : user.value.favoriteGames,
                        watchedGames: !pendingGameWrites && updated.watched_games
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

        const generation = authGeneration
        const { data } = await withTimeout(supabase.auth.getSession(), 5000)
        if (generation !== authGeneration) return
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
        if (generation !== authGeneration) return
        user.value = fresh
        saveToCache(fresh)

        loading.value = false
    }

    const init = async () => {
        if (initPromise) return initPromise
        if (initialized) return

        initPromise = runInit().then(() => {
            initialized = true
        }).catch(error => {
            console.error('Auth initialization failed:', error)
        }).finally(() => {
            loading.value = false
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

    let gameWrites: Promise<unknown> = Promise.resolve()
    let pendingGameWrites = 0
    const setGameMark = (kind: 'favorite' | 'watched', game: FavoriteGame, active: boolean) => {
        const ownerId = user.value?.id
        if (!ownerId) return Promise.reject(new Error('Войдите, чтобы отмечать матчи'))
        pendingGameWrites++
        const write = gameWrites.catch(() => {}).then(async () => {
            if (user.value?.id !== ownerId) throw new Error('Аккаунт изменился. Повторите действие.')
            const result = await authFetch(`/api/profile-games/${kind}`, {
                method: 'PUT', body: JSON.stringify({ game, active })
            })
            if (user.value?.id !== ownerId) return
            user.value.favoriteGames = normalizeFavoriteGames(result.favoriteGames)
            user.value.watchedGames = normalizeFavoriteGames(result.watchedGames)
            saveToCache(user.value)
        }).finally(() => { pendingGameWrites-- })
        gameWrites = write
        return write
    }
    const toggleFavoriteGame = async (game: FavoriteGame) => {
        const normalized = normalizeFavoriteGame(game)
        if (!normalized || !user.value) throw new Error('Не удалось определить матч')
        await setGameMark('favorite', normalized, !user.value.favoriteGames.some(item => sameGame(item, normalized)))
    }
    const toggleWatchedGame = async (game: FavoriteGame) => {
        const normalized = normalizeFavoriteGame(game)
        if (!normalized || !user.value) throw new Error('Не удалось определить матч')
        await setGameMark('watched', normalized, !user.value.watchedGames.some(item => sameGame(item, normalized)))
    }
    const replaceGameMarks = async (kind: 'favorite' | 'watched', games: FavoriteGame[]) => {
        if (!user.value) return
        const next = normalizeFavoriteGames(games)
        const previous = kind === 'favorite' ? user.value.favoriteGames : user.value.watchedGames
        for (const game of previous) if (!next.some(item => sameGame(item, game))) await setGameMark(kind, game, false)
        for (const game of next) if (!previous.some(item => sameGame(item, game))) await setGameMark(kind, game, true)
    }
    const updateFavoriteGames = (games: FavoriteGame[]) => replaceGameMarks('favorite', games)
    const updateWatchedGames = (games: FavoriteGame[]) => replaceGameMarks('watched', games)

    const syncFollowingProfiles = (ids: string[], ownerId: string, revision: number) => {
        if (user.value?.id !== ownerId || followingRevision.value !== revision || followingPending.value.length) return
        const normalized = [...new Set(ids)]
        if (normalized.join('|') === user.value.followingProfiles.join('|')) return
        user.value.followingProfiles = normalized
        saveToCache(user.value)
    }

    const setProfileFollowing = (profileId: string, following: boolean): Promise<void> => {
        const ownerId = user.value?.id
        if (!ownerId || !profileId || profileId === ownerId) return Promise.resolve()
        const generation = authGeneration
        const key = `${generation}:${ownerId}:${profileId}`
        const pending = followingRequests.get(key)
        if (pending) return pending
        const previous = user.value!.followingProfiles.includes(profileId)
        const update = (value: boolean) => {
            if (user.value?.id !== ownerId || generation !== authGeneration) return
            user.value.followingProfiles = value
                ? [...new Set([...user.value.followingProfiles, profileId])]
                : user.value.followingProfiles.filter(id => id !== profileId)
            saveToCache(user.value)
        }
        followingPending.value = [...followingPending.value, profileId]
        followingRevision.value++
        update(following)
        const request = (async () => {
            try {
                await authFetch(`/api/profile-follows/${encodeURIComponent(profileId)}`, { method: following ? 'POST' : 'DELETE' })
            } catch (error) {
                update(previous)
                throw error
            } finally {
                followingRequests.delete(key)
                if (user.value?.id === ownerId && generation === authGeneration) {
                    followingPending.value = followingPending.value.filter(id => id !== profileId)
                    followingRevision.value++
                }
            }
        })()
        followingRequests.set(key, request)
        return request
    }

    const updateFollowingProfiles = async (profiles: string[]) => {
        if (!user.value) return
        const normalized = [...new Set(profiles.map(id => id.trim()).filter(Boolean))]
        const previous = user.value.followingProfiles
        await Promise.all([
            ...previous.filter(id => !normalized.includes(id)).map(id => setProfileFollowing(id, false)),
            ...normalized.filter(id => !previous.includes(id)).map(id => setProfileFollowing(id, true))
        ])
    }

    const toggleFollowProfile = (profileId: string) =>
        setProfileFollowing(profileId, !user.value?.followingProfiles.includes(profileId))

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

        const generation = authGeneration
        const fresh = await fetchProfile(data.user.id, data.user.email ?? '')
        if (generation !== authGeneration) return
        initialized = true
        user.value = fresh
        saveToCache(fresh)
        await subscribeToProfile(data.user.id)
    }

    const signUp = async (data: {
        email: string
        password: string
        firstName: string
        lastName: string
        consents: {
            terms: boolean
            privacy: boolean
            cookies: boolean
            trademark: boolean
            copyright: boolean
            community: boolean
        }
    }) => {
        const { error } = await supabase.auth.signUp({
            email: data.email.trim(),
            password: data.password,
            options: { data: {
                registration_version: 1,
                first_name: data.firstName.trim(),
                last_name: data.lastName.trim(),
                consents: data.consents
            } }
        })
        if (error) throw error
        // No profile/session until the email code is verified. The database creates
        // the profile and queues both success messages in the confirmation transaction.
    }

    const verifyRegistration = async (email: string, token: string) => {
        const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'signup' })
        if (error) throw error
        if (!data.user || !data.session) throw new Error('Не удалось подтвердить регистрацию')
        setAccessToken(data.session.access_token)
        const fresh = await fetchProfile(data.user.id, data.user.email ?? email)
        user.value = fresh
        initialized = true
        saveToCache(fresh)
        await subscribeToProfile(data.user.id)
    }

    const resendRegistrationCode = async (email: string) => {
        const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
        if (error) throw error
    }

    const logout = async () => {
        authGeneration++
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
        followingPending.value = []
        followingRevision.value++
        loading.value = false
    }

    const subscribeAuthState = () => {
        if (authSubscription) return

        // Supabase holds its auth lock while invoking this callback. Never await
        // another Supabase call here; schedule profile requests after it returns.
        authSubscription = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                authGeneration++
                clearAccessToken()
                clearCache()
                user.value = null
                followingPending.value = []
                followingRevision.value++
                loading.value = false
                void unsubscribeProfile()
                return
            }
            if (!session?.user) return
            setAccessToken(session.access_token)
            if (user.value?.id === session.user.id && event !== 'USER_UPDATED') return
            if (user.value?.id !== session.user.id) {
                user.value = null
                followingPending.value = []
                followingRevision.value++
                loading.value = true
            }
            const generation = ++authGeneration
            setTimeout(() => {
                if (generation !== authGeneration) return
                void fetchProfile(session.user.id, session.user.email ?? '').then(async fresh => {
                    if (generation !== authGeneration) return
                    user.value = fresh
                    saveToCache(fresh)
                    await subscribeToProfile(session.user.id)
                }).catch(error => {
                    console.error('Failed to refresh authenticated profile:', error)
                }).finally(() => {
                    if (generation === authGeneration) loading.value = false
                })
            }, 0)
        })
    }

    return {
        user,
        loading,
        init,
        signIn,
        signUp,
        verifyRegistration,
        resendRegistrationCode,
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
        followingPending,
        followingRevision,
        syncFollowingProfiles,
        setProfileFollowing,
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

async function fetchFollowingProfiles(_userId: string): Promise<string[]> {
    const data = await authFetch('/api/profile-follows')
    if (!Array.isArray(data.follows)) throw new Error('Некорректный список подписок')
    return data.follows.map((row: { following_id: string }) => row.following_id).filter(Boolean)
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
