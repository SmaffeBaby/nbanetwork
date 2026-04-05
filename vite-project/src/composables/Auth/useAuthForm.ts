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

    const showForm = ref<'login' | 'register' | ''>('')

    const resetFields = () => {
        email.value = ''
        password.value = ''
        firstName.value = ''
        lastName.value = ''
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
            await signUp({
                email: email.value,
                password: password.value,
                firstName: firstName.value,
                lastName: lastName.value
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
        showForm,
        handleLogin,
        handleRegister,
        handleLogout
    }
}