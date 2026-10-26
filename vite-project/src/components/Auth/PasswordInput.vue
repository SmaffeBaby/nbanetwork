<template>
  <div class="relative">
    <input v-model="value" :type="visible ? 'text' : 'password'" :placeholder="placeholder" :aria-label="placeholder" :autocomplete="autocomplete" :minlength="8" :disabled="disabled" class="w-full rounded-lg border px-3 py-2 pr-12 focus:ring-2 focus:ring-blue-500 disabled:opacity-60" />
    <button type="button" :aria-label="visible ? 'Скрыть пароль' : 'Показать пароль'" :aria-pressed="visible" :disabled="disabled" class="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500" @click="visible = !visible">
      <EyeSlashIcon v-if="visible" class="h-5 w-5" aria-hidden="true" />
      <EyeIcon v-else class="h-5 w-5" aria-hidden="true" />
    </button>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
const value = defineModel<string>({ default: '' })
withDefaults(defineProps<{ placeholder?: string; autocomplete?: string; disabled?: boolean }>(), { placeholder: 'Пароль', autocomplete: 'current-password', disabled: false })
const visible = ref(false)
</script>
