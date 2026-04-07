<template>
  <div
      class="p-4 rounded-xl text-center transition-colors duration-200"
      :style="boxStyle"
  >
    <div class="text-sm opacity-80">{{ label }}</div>
    <div class="text-xl font-bold">{{ value }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  value: number
  color?: string
}>()

const boxStyle = computed(() => {
  if (!props.color) {
    return {
      backgroundColor: '#f3f4f6',
      color: '#111827',
    }
  }

  return {
    backgroundColor: `${props.color}15`,
    color: props.color,
    border: `1px solid ${props.color}30`,
  }
})
</script>