<template>
  <div>
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <h3 class="font-extrabold text-slate-900">{{ title }}</h3>
        <button type="button" :aria-label="`Пояснение: ${title}`" :aria-expanded="open" :aria-controls="helpId" class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-blue-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" @click="open = !open">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><circle cx="12" cy="12" r="9" /><path stroke-linecap="round" d="M12 11v6M12 7v.5" /></svg>
        </button>
      </div>
      <slot name="value" />
    </div>
    <div v-if="open" :id="helpId" class="mt-3 space-y-2 rounded-xl border border-blue-100 bg-white p-3 text-xs leading-5 text-slate-600"><slot /></div>
  </div>
</template>
<script setup lang="ts">
import { ref, useId } from 'vue'
defineProps<{ title: string }>()
const open = ref(false), helpId = useId()
</script>
