import { ref } from 'vue'
import { supabase } from '../../lib/supabase.ts'

export type AppUser = {
    id: string
    email: string
    firstName: string
    lastName: string
}

type CachedUser = AppUser & {
    cachedAt: number
}

const CACHE_KEY = 'auth_user_cache'
const CACHE_TTL = 1000 * 60 * 10

const user = ref<AppUser | null>(null)
const loading = ref(true)

let profileChannel: any = null
let authSubscription: any = null

export function useAuth() {

    const saveToCache = (userData: AppUser) => {
        const cached: CachedUser = { ...userData, cachedAt: Date.now() }
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
    }

    const getFromCache = (): AppUser | null => {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return null
        try {
            const cached: CachedUser = JSON.parse(raw)
            return {
                id: cached.id,
                email: cached.email,
                firstName: cached.firstName,
                lastName: cached.lastName
            }
        } catch {
            localStorage.removeItem(CACHE_KEY)
            return null
        }
    }

    const clearCache = () => {
        localStorage.removeItem(CACHE_KEY)
    }

    const fetchUserProfile = async (userId: string, email: string): Promise<AppUser> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', userId)
            .single()

        if (error || !data) {
            return {
                id: userId,
                email,
                firstName: '',
                lastName: ''
            }
        }

        return {
            id: userId,
            email,
            firstName: data.first_name,
            lastName: data.last_name
        }
    }

    const subscribeToProfile = (userId: string) => {
        if (profileChannel) {
            supabase.removeChannel(profileChannel)
        }

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
                    const updated = payload.new
                    const freshUser: AppUser = {
                        id: userId,
                        email: updated.email,
                        firstName: updated.first_name,
                        lastName: updated.last_name
                    }
                    user.value = freshUser
                    saveToCache(freshUser)
                    console.log('🔥 realtime: профиль обновлён')
                }
            )
            .subscribe()
    }

    const unsubscribeProfile = () => {
        if (profileChannel) {
            supabase.removeChannel(profileChannel)
            profileChannel = null
        }
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

        subscribeToProfile(userId)

        fetchUserProfile(userId, email).then(fresh => {
            user.value = fresh
            saveToCache(fresh)
        })

        loading.value = false
    }

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        const fresh = await fetchUserProfile(
            data.user.id,
            data.user.email ?? ''
        )

        user.value = fresh
        saveToCache(fresh)
        subscribeToProfile(data.user.id)
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
            last_name: data.lastName
        })

        const newUser: AppUser = {
            id: authData.user.id,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName
        }

        user.value = newUser
        saveToCache(newUser)
        subscribeToProfile(authData.user.id)
    }

    const logout = async () => {
        await supabase.auth.signOut()
        unsubscribeProfile()
        clearCache()
        user.value = null
    }

    const subscribeAuthState = () => {
        if (authSubscription) return
        authSubscription = supabase.auth.onAuthStateChange(async (_, session) => {
            if (!session?.user) {
                unsubscribeProfile()
                clearCache()
                user.value = null
                return
            }
            const fresh = await fetchUserProfile(
                session.user.id,
                session.user.email ?? ''
            )
            user.value = fresh
            saveToCache(fresh)
            subscribeToProfile(session.user.id)
        })
    }

    return {
        user,
        loading,
        init,
        signIn,
        signUp,
        logout,
        subscribeAuthState
    }
}