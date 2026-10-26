import { ref, onUnmounted } from 'vue'
import { useAuth } from './useAuth.ts'
import { useToast } from 'vue-toastification'

export function useAuthForm() {
    const toast = useToast()
    const { signIn, signUp, verifyRegistration, resendRegistrationCode, logout } = useAuth()

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

    const showForm = ref<'login' | 'register' | 'verify' | ''>('')

    const verificationCode = ref('')
    const busy = ref(false)
    const resendCooldown = ref(0)
    let cooldownTimer: ReturnType<typeof setInterval> | undefined
    const startCooldown = () => {
        clearInterval(cooldownTimer)
        resendCooldown.value = 60
        cooldownTimer = setInterval(() => {
            if (--resendCooldown.value <= 0) clearInterval(cooldownTimer)
        }, 1000)
    }
    onUnmounted(() => clearInterval(cooldownTimer))

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
        if (busy.value) return
        busy.value = true
        try {
            await signIn(email.value, password.value)

            toast.success('Вы успешно вошли')

            resetFields()
            showForm.value = ''
        } catch (err: any) {
            if (err.code === 'email_not_confirmed') {
                showForm.value = 'verify'
                toast.info('Подтвердите почту. При необходимости запросите новый код.')
            } else toast.error('Ошибка входа: ' + err.message)
        } finally { busy.value = false }
    }

    const handleRegister = async () => {
        if (busy.value) return
        if (!firstName.value.trim() || !lastName.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) || password.value.length < 8) {
            toast.warning('Укажите имя, фамилию, корректный email и пароль не короче 8 символов.')
            return
        }
        busy.value = true
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

            password.value = ''
            verificationCode.value = ''
            showForm.value = 'verify'
            startCooldown()
        } catch (err: any) {
            toast.error('Ошибка регистрации: ' + err.message)
        } finally { busy.value = false }
    }

    const handleVerify = async () => {
        if (busy.value || !/^\d{6}$/.test(verificationCode.value)) return
        busy.value = true
        try {
            await verifyRegistration(email.value, verificationCode.value)
            toast.success('Почта подтверждена. Регистрация завершена!')
            resetFields()
            verificationCode.value = ''
            showForm.value = ''
        } catch { toast.error('Код неверен или истёк. Проверьте код либо запросите новый.') }
        finally { busy.value = false }
    }
    const handleResend = async () => {
        if (busy.value || resendCooldown.value > 0) return
        busy.value = true
        try {
            await resendRegistrationCode(email.value)
            startCooldown()
            toast.success('Новый код отправлен на почту.')
        } catch { toast.error('Не удалось отправить код. Подождите минуту и попробуйте снова.') }
        finally { busy.value = false }
    }

    const handleLogout = async () => {
        await logout()
        toast.info('Вы вышли из аккаунта')
    }

    return {
        verificationCode,
        busy,
        resendCooldown,
        handleVerify,
        handleResend,
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
