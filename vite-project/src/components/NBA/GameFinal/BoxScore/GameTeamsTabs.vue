<template>
  <div class="flex gap-2 border-b">
    <button
        v-for="t in teams"
        :key="t.abbr"
        @click="$emit('update:activeTeam', t.abbr)"
        class="flex items-center gap-2 px-4 py-2 text-sm"
        :class="activeTeam === t.abbr
        ? 'border-b-2 border-black font-semibold'
        : 'text-gray-500'"
    >
      <img :src="t.logo" class="w-5 h-5" />
      {{ t.name }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  teams: any[]
  activeTeam: string
}>()

defineEmits<{
  (e: 'update:activeTeam', value: string): void
}>()
</script>