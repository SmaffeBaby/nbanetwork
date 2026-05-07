import { storeToRefs } from 'pinia'
import { useAuthStore, type AppUser } from '../../stores/auth'

export type { AppUser }

export function useAuth() {
    const store = useAuthStore()
    const { user, loading } = storeToRefs(store)

    return {
        user,
        loading,
        init: () => store.init(),
        signIn: store.signIn,
        signUp: store.signUp,
        logout: store.logout,
        subscribeAuthState: store.subscribeAuthState,
        updateHideScores: store.updateHideScores,
        updateFavoriteTeams: store.updateFavoriteTeams,
        toggleFavoriteTeam: store.toggleFavoriteTeam
    }
}
