import { computed, onMounted } from 'vue'
import { useAuth } from './useAuth.ts'
import { useAuthForm } from './useAuthForm.ts'
import { usePasswordReset } from './usePasswordReset.ts'
import { useProfileNavigation } from '../useProfileNavigation.ts'
import {
    createRegistrationConsentModels,
    registrationConsentItems
} from './useRegistrationConsents'

export function useAuthPanel() {
    const auth = useAuth()
    const form = useAuthForm()

    const { sendPasswordReset } = usePasswordReset(form.email)
    const { goToProfile } = useProfileNavigation()

    const consentModels = createRegistrationConsentModels({
        acceptedTerms: form.acceptedTerms,
        acceptedPrivacy: form.acceptedPrivacy,
        acceptedCookies: form.acceptedCookies,
        acceptedTrademark: form.acceptedTrademark,
        acceptedCopyright: form.acceptedCopyright,
        acceptedCommunityPolicy: form.acceptedCommunityPolicy
    })

    const userInitials = computed(() => {
        const first = auth.user.value?.firstName?.trim().charAt(0) ?? ''
        const last = auth.user.value?.lastName?.trim().charAt(0) ?? ''
        const initials = `${first}${last}`.trim()

        return initials || 'U'
    })

    const userName = computed(() => {
        const fullName = `${auth.user.value?.firstName ?? ''} ${auth.user.value?.lastName ?? ''}`.trim()

        return fullName || auth.user.value?.email || 'Пользователь'
    })

    onMounted(async () => {
        await auth.init()
        auth.subscribeAuthState()
    })

    return {
        ...form,
        user: auth.user,
        loadingUser: auth.loading,
        consentItems: registrationConsentItems,
        consentModels,
        sendPasswordReset,
        goToProfile,
        userInitials,
        userName
    }
}
