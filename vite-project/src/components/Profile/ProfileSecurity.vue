<template>
  <section class="space-y-4">
    <h1 class="m-0 text-2xl font-bold">Безопасность</h1>
    <template v-if="email">
      <p class="text-sm leading-6 text-slate-600">Отправим ссылку для сброса пароля на <strong>{{ email }}</strong>. По ссылке можно задать новый пароль с подтверждением.</p>
      <button type="button" :disabled="sendingReset" class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50" @click="sendPasswordReset">{{ sendingReset ? 'Отправляем…' : 'Сбросить пароль' }}</button>
    </template>
    <p v-else class="text-sm text-slate-600">Войдите в аккаунт, чтобы открыть настройки безопасности.</p>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { usePasswordReset } from '../../composables/Auth/usePasswordReset'
const auth = useAuthStore()
const email = computed(() => auth.user?.email ?? '')
const { sendPasswordReset, sendingReset } = usePasswordReset(email)
</script>
