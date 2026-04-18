<template>
  <div class="flex flex-wrap gap-3 items-center">
    <input
        v-model="model"
        placeholder="Search player or position..."
        class="px-3 py-2 border rounded-lg text-sm w-52"
    />
  </div>
</template>

<script setup lang="ts">
const model = defineModel<string>()
</script>