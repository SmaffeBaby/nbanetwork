import { useRouter } from 'vue-router'

export function useProfileNavigation() {
    const router = useRouter()

    const goToProfile = () => {
        router.push('/profile')
    }

    return {
        goToProfile
    }
}