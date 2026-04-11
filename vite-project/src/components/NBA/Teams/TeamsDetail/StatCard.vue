<template>
  <div class="bg-white p-4 rounded-xl shadow text-center">
    <div class="text-gray-500 text-sm">{{ title }}</div>
    <div class="text-xl font-bold">{{ value }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
}>()
</script>