<template>
  <div class="bg-white p-4 rounded-2xl shadow">

    <h2 class="font-semibold mb-3">{{ title }}</h2>

    <div
        v-for="p in visiblePlayers"
        :key="p.PLAYER_ID"
        class="flex justify-between items-center py-1 cursor-pointer hover:bg-gray-100"
        @click="$router.push(`/player/${encodeURIComponent(p.PLAYER_NAME)}`)"
    >
      <div class="flex items-center gap-2">
        <img
            :src="getPlayerImage(p)"
            :data-player-id="p.PLAYER_ID"
            class="w-10 h-10 rounded-full object-cover"
            @error="handleImageError"
        />
        {{ p.PLAYER_NAME }}
      </div>

      <span class="font-bold">{{ p[stat] }}</span>
    </div>

    <button
        class="text-sm text-blue-500 mt-2"
        @click="expanded = !expanded"
    >
      {{ expanded ? 'Show less' : 'Show more' }}
    </button>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getPlayerImage, handleImageError } from '../../../utils/playerImage'

type StatKey = 'PTS' | 'REB' | 'AST' | 'STL' | 'BLK' | 'TOV'

interface Player {
  PLAYER_ID: number
  PLAYER_NAME: string
  TEAM_ABBREVIATION: string
  PTS: number
  REB: number
  AST: number
  STL: number
  BLK: number
  TOV: number
}

const props = defineProps<{
  title: string
  stat: StatKey
  players: Player[]
}>()

const expanded = ref(false)

const sorted = computed(() => {
  return [...(props.players || [])].sort(
      (a, b) => b[props.stat] - a[props.stat]
  )
})

const visiblePlayers = computed(() => {
  return sorted.value.slice(0, expanded.value ? 20 : 5)
})
</script>