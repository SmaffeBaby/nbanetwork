<template>
  <aside class="md:w-64 w-full bg-white border-b md:border-b-0 md:border-r p-2 md:p-4">
    <div class="flex md:flex-col gap-2 overflow-x-auto">
      <h2 class="hidden md:block text-lg font-semibold mb-2">Настройки</h2>

      <button
          class="whitespace-nowrap px-4 py-2 rounded-lg transition text-sm md:text-base"
          :class="activeTab === 'main' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'"
          @click="setTab('main')"
      >
        Основные
      </button>

      <button
          class="whitespace-nowrap px-4 py-2 rounded-lg transition opacity-50 cursor-not-allowed text-sm md:text-base"
          :class="activeTab === 'security' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'"
          @click="setTab('security')"
      >
        Безопасность
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
const props = defineProps<{
  activeTab: 'main' | 'security'
}>()

const emit = defineEmits<{
  (e: 'changeTab', tab: 'main' | 'security'): void
}>()

const setTab = (tab: 'main' | 'security') => {
  emit('changeTab', tab)
}
</script>