<template>
  <div class="p-4 space-y-6">
    <button class="text-sm text-blue-500" @click="$router.back()">
      ← Back
    </button>

    <div v-if="player" class="space-y-4">

      <div class="bg-gray-900 text-white p-6 rounded-2xl flex items-center gap-6">

        <img
            :src="getPlayerImage(player)"
            :data-player-id="player.PLAYER_ID"
            class="w-24 h-24 rounded-xl object-cover bg-gray-800 border border-gray-700"
            @error="handleImageError"
        />

        <div>
          <h1 class="text-2xl font-bold">{{ player.PLAYER_NAME }}</h1>
          <p class="text-gray-400">{{ player.TEAM_ABBREVIATION }}</p>
        </div>

      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatBox label="PPG" :value="player.PTS" />
        <StatBox label="RPG" :value="player.REB" />
        <StatBox label="APG" :value="player.AST" />
        <StatBox label="SPG" :value="player.STL" />
        <StatBox label="BPG" :value="player.BLK" />
        <StatBox label="TOV" :value="player.TOV" />
      </div>

      <div class="bg-white p-4 rounded-2xl shadow">
        <h2 class="font-semibold mb-2">Performance Trend</h2>
        <PlayerChart :player-id="player.PLAYER_ID" season="2025-26" />
      </div>

    </div>

    <div v-else class="text-center">Loading player...</div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed, onMounted } from 'vue'
import { usePlayerStats } from '../../../composables/NBA/player_stats/usePlayerStats'
import StatBox from './StatBox.vue'
import PlayerChart from './PlayerChart.vue'
import { getPlayerImage, handleImageError } from '../../../utils/playerImage'

const route = useRoute()
const { players, fetchPlayerStats } = usePlayerStats()

onMounted(() => {
  if (!players.value.length) fetchPlayerStats()
})

const player = computed(() => {
  const name = decodeURIComponent(route.params.name as string)
  return players.value.find(p => p.PLAYER_NAME === name)
})
</script>