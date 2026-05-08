<template>
  <label class="flex w-full flex-col gap-1 text-xs font-semibold uppercase text-gray-500 sm:w-auto">
    Команда
    <select
        :value="modelValue"
        class="min-h-10 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="all">Все команды</option>
      <option
          v-for="team in teams"
          :key="team.abbr"
          :value="team.abbr"
      >
        {{ team.name }} ({{ team.abbr }})
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  teams: {
    abbr: string
    name: string
  }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
