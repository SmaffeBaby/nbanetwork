<template>
  <div>

    <div class="flex gap-2 border-b mb-4">
      <button
          class="px-4 py-2 text-sm transition"
          :class="activeTab === 'overview'
          ? 'border-b-2 border-black font-semibold'
          : 'text-gray-500 hover:text-black'"
          @click="activeTab = 'overview'"
      >
        Обзор
      </button>

      <button
          class="px-4 py-2 text-sm transition"
          :class="activeTab === 'players'
          ? 'border-b-2 border-black font-semibold'
          : 'text-gray-500 hover:text-black'"
          @click="activeTab = 'players'"
      >
        Статистика игроков
      </button>

      <button
          class="px-4 py-2 text-sm transition"
          :class="activeTab === 'teamStats'
          ? 'border-b-2 border-black font-semibold'
          : 'text-gray-500 hover:text-black'"
          @click="activeTab = 'teamStats'"
      >
        Командная статистика
      </button>

      <button
          class="px-4 py-2 text-sm transition"
          :class="activeTab === 'injury'
          ? 'border-b-2 border-black font-semibold'
          : 'text-gray-500 hover:text-black'"
          @click="activeTab = 'injury'"
      >
        Травмы
      </button>

      <button
          class="px-4 py-2 text-sm transition"
          :class="activeTab === 'broadcasts'
          ? 'border-b-2 border-black font-semibold'
          : 'text-gray-500 hover:text-black'"
          @click="activeTab = 'broadcasts'"
      >
        Трансляции
      </button>

      <button
          class="relative px-4 py-2 text-sm transition"
          :class="activeTab === 'comments'
          ? 'border-b-2 border-black font-semibold'
          : 'text-gray-500 hover:text-black'"
          @click="activeTab = 'comments'"
      >
        Комментарии
        <span
            v-if="normalizedCommentsUnreadCount > 0"
            class="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full"
        >
          {{ normalizedCommentsUnreadCount }}
        </span>
      </button>

      <button
          class="px-4 py-2 text-sm transition"
          :class="activeTab === 'data'
          ? 'border-b-2 border-black font-semibold'
          : 'text-gray-500 hover:text-black'"
          @click="activeTab = 'data'"
      >
        Данные
      </button>
    </div>

    <div class="relative">

      <div
          class="transition-all duration-500"
          :class="isLocked
            ? 'blur-md scale-[0.98] opacity-80 pointer-events-none select-none'
            : 'blur-0 scale-100 opacity-100'"
      >

        <div v-if="activeTab === 'overview'">
          <slot name="overview" />
        </div>

        <div v-else-if="activeTab === 'players'">
          <slot name="players" />
        </div>

        <div v-else-if="activeTab === 'teamStats'">
          <slot name="teamStats" />
        </div>

        <div v-else-if="activeTab === 'injury'">
          <slot name="injury" />
        </div>

        <div v-else-if="activeTab === 'broadcasts'">
          <slot name="broadcasts" />
        </div>

        <div v-else-if="activeTab === 'comments'">
          <slot name="comments" :active="activeTab === 'comments' && !isLocked" />
        </div>

        <div v-else>
          <slot name="data" />
        </div>

      </div>

      <transition name="fade">
        <div
            v-if="isLocked"
            class="absolute inset-0 flex items-center justify-center backdrop-blur-sm"
        >
          <button
              @click="reveal"
              class="flex items-center gap-2 px-5 py-3 bg-black/90 text-white rounded-xl shadow-lg
                   hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <EyeIcon class="w-5 h-5" />
            Осторожно, спойлеры
          </button>
        </div>
      </transition>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { EyeIcon } from '@heroicons/vue/24/outline'

type Tab = 'overview' | 'players' | 'teamStats' | 'injury' | 'broadcasts' | 'comments' | 'data'

const props = defineProps<{
  commentsUnreadCount?: number
}>()

const activeTab = ref<Tab>('overview')
const revealed = ref(false)
const normalizedCommentsUnreadCount = computed(() => props.commentsUnreadCount ?? 0)

const reveal = () => {
  revealed.value = true
}

const isLocked = computed(() =>
    !revealed.value && activeTab.value !== 'injury'
)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>