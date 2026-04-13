<template>
  <div
      v-if="recap"
      class="p-6 rounded-2xl shadow-md bg-white border border-gray-100 space-y-5"
  >

    <div class="flex justify-left mb-2">
      <img
          src="/logos/RE_AI.svg"
          alt="RE AI"
          class="h-35 w-35 opacity-80"
      />
    </div>

    <div class="flex justify-between items-center">
      <span class="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
        {{ recap.insight || '—' }}
      </span>
    </div>

    <div class="space-y-3">
      <div
          v-for="(line, i) in recap.storyline || []"
          :key="i"
          class="
      group
      relative
      p-3
      rounded-xl
      border border-gray-100
      bg-gray-50
      hover:bg-white
      hover:shadow-sm
      transition-all
      duration-200
      overflow-hidden
    "
      >

        <div class="absolute left-0 top-0 h-full w-1 bg-gray-200 group-hover:bg-blue-400 transition-colors"></div>

        <div
            class="text-sm text-gray-800 leading-relaxed pl-3"
            v-html="line"
        />
      </div>
    </div>

    <div
        v-if="recap.mvp"
        class="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-center gap-4"
    >
      <div class="w-12 h-12 shrink-0">
        <img
            v-if="recap.mvp?.PLAYER_ID"
            :src="getPlayerImage(recap.mvp)"
            :data-player-id="recap.mvp.PLAYER_ID"
            @error="handleImageError"
            class="w-12 h-12 rounded-full object-cover border border-yellow-300"
            alt="MVP"
        />

        <div
            v-else
            class="w-12 h-12 rounded-full bg-yellow-200 flex items-center justify-center text-sm font-semibold text-yellow-700"
        >
          {{ getInitials(recap.mvp?.name) }}
        </div>
      </div>

      <div>
        <div class="text-xs uppercase text-yellow-600 font-semibold">
          🏆 MVP
        </div>

        <div class="text-lg font-semibold text-gray-900">
          {{ recap.mvp?.name || '—' }}
        </div>

        <div class="text-sm text-gray-600">
          {{ recap.mvp?.stats || '' }}
        </div>
      </div>
    </div>

    <div
        v-if="recap.runs"
        class="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100"
        v-html="recap.runs"
    />

    <div
        v-if="recap.clutch"
        class="bg-gray-50 border border-gray-100 p-4 rounded-xl"
    >
      <div class="text-xs text-gray-500 mb-1">🔥 Clutch</div>
      <div class="text-sm text-gray-800">
        {{ recap.clutch }}
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <div
          v-for="(q, i) in recap.quarters || []"
          :key="i"
          class="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-lg"
      >
        {{ q }}
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { getPlayerImage, handleImageError } from '../../../utils/playerImage'

defineProps<{
  recap: any
}>()

const getInitials = (name?: string) => {
  if (!name) return '?'


  return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
}
</script>

<style>
a {
  color: #2563eb;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>