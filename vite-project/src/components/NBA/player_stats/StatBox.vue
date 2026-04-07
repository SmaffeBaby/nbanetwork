<template>
  <div class="bg-gray-100 p-4 rounded-xl text-center">
    <div class="text-gray-500 text-sm">{{ label }}</div>
    <div class="text-xl font-bold">{{ value }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: number
}>()
</script>