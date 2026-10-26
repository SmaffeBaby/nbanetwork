<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <form class="w-full max-w-sm space-y-4 rounded-2xl border bg-white p-6 text-slate-950 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="verify-registration-title" @submit.prevent="$emit('verify')">
        <h2 id="verify-registration-title" class="text-center text-2xl font-bold">Подтвердите почту</h2>
        <p class="text-sm text-slate-600">Код из 6 цифр отправлен на <strong>{{ email }}</strong>. Введите его, чтобы завершить регистрацию. Код действует 10 минут.</p>
        <input v-model="code" aria-label="Код подтверждения" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required class="w-full rounded-lg border px-3 py-3 text-center font-mono text-2xl tracking-[0.35em] focus:ring-2 focus:ring-blue-500" />
        <button type="submit" :disabled="busy || !/^\d{6}$/.test(code)" class="w-full rounded-lg bg-blue-600 py-2 font-bold text-white disabled:opacity-50">{{ busy ? 'Проверяем…' : 'Подтвердить регистрацию' }}</button>
        <button type="button" :disabled="busy || cooldown > 0" class="w-full text-sm font-semibold text-blue-700 disabled:text-slate-400" @click="$emit('resend')">{{ cooldown > 0 ? `Отправить ещё раз через ${cooldown} с` : 'Отправить код повторно' }}</button>
        <button type="button" :disabled="busy" class="w-full text-sm text-slate-500" @click="$emit('close')">Закрыть</button>
      </form>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
const code = defineModel<string>('code', { default: '' })
defineProps<{ open: boolean; email: string; busy: boolean; cooldown: number }>()
defineEmits<{ verify: []; resend: []; close: [] }>()
</script>
