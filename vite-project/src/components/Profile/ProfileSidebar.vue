<template>
  <aside class="w-full rounded-2xl bg-white p-2 shadow-sm md:w-64 md:rounded-none md:border-r md:p-4 md:shadow-none">
    <div class="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
      <h2 class="hidden md:block text-lg font-semibold mb-2">Настройки</h2>

      <button
          class="min-w-fit whitespace-nowrap rounded-lg px-4 py-2 text-sm transition md:text-base"
          :class="activeTab === 'main' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'"
          @click="setTab('main')"
      >
        Основные
      </button>

      <button
          class="min-w-fit whitespace-nowrap rounded-lg px-4 py-2 text-sm opacity-50 transition cursor-not-allowed md:text-base"
          :class="activeTab === 'security' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'"
          @click="setTab('security')"
      >
        Безопасность
      </button>

      <button
          class="min-w-fit whitespace-nowrap rounded-lg px-4 py-2 text-sm transition md:text-base"
          :class="activeTab === 'likedArticles' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'"
          @click="setTab('likedArticles')"
      >
        Понравившиеся статьи
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
const props = defineProps<{
  activeTab: 'main' | 'likedArticles' | 'security'
}>()

const emit = defineEmits<{
  (e: 'changeTab', tab: 'main' | 'likedArticles' | 'security'): void
}>()

const setTab = (tab: 'main' | 'likedArticles' | 'security') => {
  emit('changeTab', tab)
}
</script>
