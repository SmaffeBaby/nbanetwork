<template>
  <div class="bg-white dark:bg-slate-900 p-3 rounded-xl shadow text-center sm:p-4">
    <div class="text-xs text-gray-500 dark:text-slate-400 sm:text-sm">{{ title }}</div>
    <div class="text-lg font-bold sm:text-xl">{{ value }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
}>()
</script>