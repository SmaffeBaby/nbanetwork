import { ref, type Ref } from 'vue'
import { useToast } from 'vue-toastification'
import { supabase } from '../../lib/supabase'

export function usePasswordReset(email: Ref<string>) {
    const toast = useToast()
    const sendingReset = ref(false)
    let nextRequest = 0
    const sendPasswordReset = async () => {
        if (sendingReset.value) return
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
            toast.warning('Введите корректный email для сброса пароля.')
            return
        }
        if (Date.now() < nextRequest) {
            toast.info('Повторный запрос доступен через минуту.')
            return
        }
        sendingReset.value = true
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
                redirectTo: `${window.location.origin}/reset-password`
            })
            if (error) throw error
            nextRequest = Date.now() + 60000
            toast.success('Если аккаунт с таким адресом существует, письмо со ссылкой для сброса пароля отправлено.')
        } catch {
            toast.error('Не удалось отправить письмо. Попробуйте через минуту.')
        } finally { sendingReset.value = false }
    }
    return { sendPasswordReset, sendingReset }
}
