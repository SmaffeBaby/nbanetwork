<template>
  <div
      class="p-4 rounded-xl text-center transition-colors duration-200"
      :style="boxStyle"
  >
    <div class="text-sm opacity-80">{{ label }}</div>
    <div class="text-xl font-bold">{{ averageValue }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Game = Record<string, number | string | undefined | null>

const props = defineProps<{
  label: string
  games: Game[]
  color?: string
}>()

const averageValue = computed(() => {
  const vals = props.games
      .map(g => {
        const v = g[props.label]
        return typeof v === 'number' ? v : 0
      })

  if (!vals.length) return 0

  const sum = vals.reduce((a, b) => a + b, 0)
  return Math.round(sum / vals.length)
})

function hexToRgba(hex: string, alpha: number) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')

  const bigint = parseInt(h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const boxStyle = computed(() => {
  if (!props.color) {
    return {
      backgroundColor: '#f3f4f6',
      color: '#111827',
      border: '1px solid #e5e7eb',
    }
  }

  return {
    backgroundColor: hexToRgba(props.color, 0.08),
    color: props.color,
    border: `1px solid ${hexToRgba(props.color, 0.2)}`,
  }
})
</script>