import type { Ref } from 'vue'

export function usePasswordReset(email: Ref<string>) {
    const sendPasswordReset = async () => {
        if (!email.value) {
            alert('Введите email для сброса пароля')
            return
        }

        try {
            await fetch('/api/password-reset', {
                method: 'POST',
                body: JSON.stringify({ email: email.value }),
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            alert(`Ссылка для сброса пароля отправлена на ${email.value}`)
        } catch (e) {
            alert('Ошибка при отправке ссылки для сброса пароля')
            console.error(e)
        }
    }

    return {
        sendPasswordReset
    }
}