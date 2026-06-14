<template>
  <div class="inline-flex w-full rounded-xl bg-gray-100 p-1 shadow-inner sm:w-auto">
    <button
        type="button"
        title="Сначала новые"
        class="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition sm:flex-none"
        :class="modelValue === 'desc' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'"
        @click="emit('update:modelValue', 'desc')"
    >
      <ArrowDownIcon class="h-4 w-4" />
      <span>Новые</span>
    </button>

    <button
        type="button"
        title="Сначала старые"
        class="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition sm:flex-none"
        :class="modelValue === 'asc' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'"
        @click="emit('update:modelValue', 'asc')"
    >
      <ArrowUpIcon class="h-4 w-4" />
      <span>Старые</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/vue/24/outline'
import type { DateSortOrder } from '../../composables/useDateSort'

defineProps<{
  modelValue: DateSortOrder
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DateSortOrder]
}>()
</script>
