import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export type AppUser = {
    id: string
    email: string
    firstName: string
    lastName: string
    avatarImg: string | null
    hideScores: boolean
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
                hideScores: cached.hideScores ?? true
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
        const { data, error } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_img, hide_scores')
            .eq('id', userId)
            .single()

        if (error || !data) {
            return {
                id: userId,
                email,
                firstName: '',
                lastName: '',
                avatarImg: null,
                hideScores: true
            }
        }

        return {
            id: userId,
            email,
            firstName: data.first_name,
            lastName: data.last_name,
            avatarImg: data.avatar_img ?? null,
            hideScores: data.hide_scores ?? true
        }
    }

    const unsubscribeProfile = async () => {
        if (profileChannel) {
            await supabase.removeChannel(profileChannel)
            profileChannel = null
        }
    }

    const subscribeToProfile = async (userId: string) => {
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
                        email?: string
                    }
                    if (!user.value) return

                    user.value = {
                        ...user.value,
                        firstName: updated.first_name ?? user.value.firstName,
                        lastName: updated.last_name ?? user.value.lastName,
                        avatarImg: updated.avatar_img ?? user.value.avatarImg,
                        hideScores: updated.hide_scores ?? user.value.hideScores,
                        email: updated.email ?? user.value.email
                    }
                    saveToCache(user.value)
                }
            )
            .subscribe()
    }

    const init = async () => {
        loading.value = true

        const cached = getFromCache()
        if (cached) user.value = cached

        const { data } = await supabase.auth.getSession()
        const session = data.session

        if (!session?.user) {
            user.value = null
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

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

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

        await supabase.from('profiles').insert({
            id: authData.user.id,
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName,
            avatar_img: null,
            hide_scores: true
        })

        const newUser: AppUser = {
            id: authData.user.id,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            avatarImg: null,
            hideScores: true
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
        user.value = null
        loading.value = false
    }

    const subscribeAuthState = () => {
        if (authSubscription) return

        authSubscription = supabase.auth.onAuthStateChange(async (_, session) => {
            if (session?.user) {
                const fresh = await fetchProfile(session.user.id, session.user.email ?? '')
                user.value = fresh
                saveToCache(fresh)
                await subscribeToProfile(session.user.id)
            } else {
                await unsubscribeProfile()
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
        updateHideScores
    }
})
