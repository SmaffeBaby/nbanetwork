import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

export function useProfileNavigation() {
    const router = useRouter()
    const auth = useAuthStore()
    const profilePath = computed(() => auth.user ? `/profile/${auth.user.id}` : '/profile')
    const goToProfile = () => router.push(profilePath.value)
    return { goToProfile, profilePath }
}
