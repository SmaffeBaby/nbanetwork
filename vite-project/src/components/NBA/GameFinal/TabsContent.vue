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
          :class="activeTab === 'data'
          ? 'border-b-2 border-black font-semibold'
          : 'text-gray-500 hover:text-black'"
          @click="activeTab = 'data'"
      >
        Данные
      </button>
    </div>

    <div>
      <div v-if="activeTab === 'overview'" class="relative">

        <div
            class="transition-all duration-500"
            :class="!revealed
            ? 'blur-md scale-[0.98] opacity-80 pointer-events-none select-none'
            : 'blur-0 scale-100 opacity-100'"
        >
          <slot name="overview" />
        </div>

        <transition name="fade">
          <div
              v-if="!revealed"
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

      <slot name="data" v-if="activeTab === 'data'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { EyeIcon } from '@heroicons/vue/24/outline'

const activeTab = ref<'overview' | 'data'>('overview')
const revealed = ref(false)

const reveal = () => {
  revealed.value = true
}
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