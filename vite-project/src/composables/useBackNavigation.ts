import { useRouter, type RouteLocationRaw } from 'vue-router'
import { navigateBack } from '../router/backNavigation'

export function useBackNavigation(fallback: RouteLocationRaw) {
    const router = useRouter()
    return { goBack: () => navigateBack(router, fallback) }
}
