import { ref } from 'vue'
import { useAuth } from './useAuth.ts'
import { useToast } from 'vue-toastification'

export function useAuthForm() {
    const toast = useToast()
    const { signIn, signUp, logout } = useAuth()

    const email = ref('')
    const password = ref('')
    const firstName = ref('')
    const lastName = ref('')
    const acceptedTerms = ref(false)
    const acceptedPrivacy = ref(false)
    const acceptedCookies = ref(false)
    const acceptedTrademark = ref(false)
    const acceptedCopyright = ref(false)
    const acceptedCommunityPolicy = ref(false)

    const showForm = ref<'login' | 'register' | ''>('')

    const resetFields = () => {
        email.value = ''
        password.value = ''
        firstName.value = ''
        lastName.value = ''
        acceptedTerms.value = false
        acceptedPrivacy.value = false
        acceptedCookies.value = false
        acceptedTrademark.value = false
        acceptedCopyright.value = false
        acceptedCommunityPolicy.value = false
    }

    const handleLogin = async () => {
        try {
            await signIn(email.value, password.value)

            toast.success('Вы успешно вошли')

            resetFields()
            showForm.value = ''
        } catch (err: any) {
            toast.error('Ошибка входа: ' + err.message)
        }
    }

    const handleRegister = async () => {
        try {
            const hasAllConsents = [
                acceptedTerms.value,
                acceptedPrivacy.value,
                acceptedCookies.value,
                acceptedTrademark.value,
                acceptedCopyright.value,
                acceptedCommunityPolicy.value
            ].every(Boolean)

            if (!hasAllConsents) {
                toast.warning('Для регистрации нужно принять все правила и политики проекта.')
                return
            }

            await signUp({
                email: email.value,
                password: password.value,
                firstName: firstName.value,
                lastName: lastName.value,
                consents: {
                    terms: acceptedTerms.value,
                    privacy: acceptedPrivacy.value,
                    cookies: acceptedCookies.value,
                    trademark: acceptedTrademark.value,
                    copyright: acceptedCopyright.value,
                    community: acceptedCommunityPolicy.value
                }
            })

            toast.success(`Проверьте почту: ${email.value}`)

            resetFields()
            showForm.value = 'login'
        } catch (err: any) {
            toast.error('Ошибка регистрации: ' + err.message)
        }
    }

    const handleLogout = async () => {
        await logout()
        toast.info('Вы вышли из аккаунта')
    }

    return {
        email,
        password,
        firstName,
        lastName,
        acceptedTerms,
        acceptedPrivacy,
        acceptedCookies,
        acceptedTrademark,
        acceptedCopyright,
        acceptedCommunityPolicy,
        showForm,
        handleLogin,
        handleRegister,
        handleLogout
    }
}
