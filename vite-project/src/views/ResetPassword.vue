<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
    <section class="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
      <h1 class="m-0 text-2xl font-bold">Новый пароль</h1>
      <p v-if="checking" role="status" class="text-slate-600">Проверяем ссылку…</p>
      <p v-else-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
      <template v-else-if="complete">
        <p role="status" class="text-green-700">Пароль изменён. Войдите с новым паролем.</p>
        <RouterLink to="/" class="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-white">На главную</RouterLink>
      </template>
      <form v-else-if="verified" class="space-y-4" @submit.prevent="savePassword">
        <p class="text-sm text-slate-600">Придумайте пароль не короче 8 символов и повторите его.</p>
        <PasswordInput v-model="password" placeholder="Новый пароль" autocomplete="new-password" :disabled="saving" />
        <PasswordInput v-model="confirmation" placeholder="Подтвердите новый пароль" autocomplete="new-password" :disabled="saving" />
        <p v-if="formError" role="alert" class="text-sm text-red-700">{{ formError }}</p>
        <button :disabled="saving" class="w-full rounded-lg bg-blue-600 py-2 font-bold text-white disabled:opacity-50">{{ saving ? 'Сохраняем…' : 'Сохранить пароль' }}</button>
      </form>
      <RouterLink v-if="error" to="/" class="inline-block text-sm text-blue-700">На главную — запросить новую ссылку через «Войти»</RouterLink>
    </section>
  </main>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import PasswordInput from '../components/Auth/PasswordInput.vue'
import { useAuthStore } from '../stores/auth'
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const checking = ref(true)
const verified = ref(false)
const complete = ref(false)
const saving = ref(false)
const error = ref('')
const formError = ref('')
const password = ref('')
const confirmation = ref('')
onMounted(async () => {
    const token = typeof route.query.token_hash === 'string' ? route.query.token_hash : ''
    if (!token || route.query.type !== 'recovery') {
        error.value = 'Откройте ссылку из письма о сбросе пароля. Если она истекла, запросите новую.'
        checking.value = false
        return
    }
    try {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({ token_hash: token, type: 'recovery' })
        if (verifyError || !data.session) throw verifyError
        verified.value = true
    } catch { error.value = 'Ссылка недействительна, уже использована или истекла. Запросите новое письмо о сбросе пароля.' }
    finally {
        checking.value = false
        // Remove the one-time token from the address bar and subsequent navigation.
        await router.replace({ path: '/reset-password', query: {} })
    }
})
const savePassword = async () => {
    if (!verified.value || saving.value) return
    formError.value = ''
    if (password.value.length < 8) { formError.value = 'Пароль должен содержать не менее 8 символов.'; return }
    if (password.value !== confirmation.value) { formError.value = 'Пароли не совпадают.'; return }
    saving.value = true
    try {
        const { error: updateError } = await supabase.auth.updateUser({ password: password.value })
        if (updateError) throw updateError
        password.value = ''; confirmation.value = ''
        await auth.logout()
        complete.value = true
        verified.value = false
    } catch { formError.value = 'Не удалось сохранить пароль. Выберите другой пароль или запросите новую ссылку.' }
    finally { saving.value = false }
}
</script>
