<template>
  <div>

    <div class="mb-4 grid grid-cols-1 gap-3 sm:flex sm:items-center sm:justify-start">
      <slot name="controls" />

      <Categories
        v-model="activeTab"
        :options="tabOptions"
        placeholder="Раздел игры"
      />
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
            class="absolute inset-0 flex items-start justify-center bg-white/20 px-3 py-3 backdrop-blur-sm sm:bg-transparent sm:px-0 sm:py-6"
        >
          <button
              @click="reveal"
              class="flex min-h-14 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-black/90 px-5 py-3 text-sm font-semibold text-white shadow-lg sm:w-auto
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
import Categories from '../../Categories/Categories.vue'
import type { CategoryOption } from '../../../types/categories'

type Tab = 'overview' | 'players' | 'teamStats' | 'injury' | 'broadcasts' | 'comments' | 'data'

const props = defineProps<{
  commentsUnreadCount?: number
}>()

const activeTab = ref<Tab>('overview')
const revealed = ref(false)
const normalizedCommentsUnreadCount = computed(() => props.commentsUnreadCount ?? 0)
const tabOptions = computed<CategoryOption<Tab>[]>(() => [
  { value: 'overview', label: 'Обзор' },
  { value: 'players', label: 'Статистика игроков' },
  { value: 'teamStats', label: 'Командная статистика' },
  { value: 'injury', label: 'Травмы' },
  { value: 'broadcasts', label: 'Трансляции' },
  {
    value: 'comments',
    label: 'Комментарии',
    badge: normalizedCommentsUnreadCount.value || undefined,
    dividerBefore: true
  },
  { value: 'data', label: 'Данные' }
])

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
