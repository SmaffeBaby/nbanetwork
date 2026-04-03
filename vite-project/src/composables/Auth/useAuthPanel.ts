import { onMounted } from 'vue'
import { useAuth } from './useAuth.ts'
import { useAuthForm } from './useAuthForm.ts'
import { usePasswordReset } from './usePasswordReset.ts'
import { useProfileNavigation } from '../useProfileNavigation.ts'

export function useAuthPanel() {
    const auth = useAuth()
    const form = useAuthForm()

    const { sendPasswordReset } = usePasswordReset(form.email)
    const { goToProfile } = useProfileNavigation()

    onMounted(async () => {
        await auth.init()
        auth.subscribeAuthState()
    })

    return {
        ...form,
        user: auth.user,
        loadingUser: auth.loading,
        sendPasswordReset,
        goToProfile
    }
}