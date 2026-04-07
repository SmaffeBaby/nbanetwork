<template>
  <div class="p-4 space-y-6">

    <button
        @click="$router.back()"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl
             bg-white/10 backdrop-blur-md text-black text-sm font-medium
             border border-white/20 shadow-sm
             hover:bg-white/20 hover:shadow-md hover:-translate-y-0.5
             active:scale-95 transition-all duration-200"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>

    <div v-if="player" class="space-y-4">

      <div
          class="p-6 rounded-2xl flex items-center gap-6 text-white shadow-md relative overflow-hidden"
          :style="cardStyle"
      >

        <img
            :src="getPlayerImage(player)"
            :data-player-id="player.PLAYER_ID"
            class="w-24 h-24 rounded-xl object-cover bg-gray-800 border border-gray-700 z-10 relative"
            @error="handleImageError"
        />

        <div class="flex flex-col gap-2 z-10 relative">
          <h1 class="text-2xl font-bold drop-shadow-md" style="color: white">
            {{ player.PLAYER_NAME }}
          </h1>

          <div
              v-if="hasTeam"
              class="flex items-center gap-2 px-3 py-1 rounded-full font-semibold text-white"
              :style="{ backgroundColor: teamStyle?.bgColorHex }"
          >
            <img
                :src="getTeamLogo(player.TEAM_ABBREVIATION)"
                alt="Logo"
                class="w-6 h-6 rounded-full object-cover bg-white/20"
            />
            <span>{{ teamFullName }}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatBox
            v-for="stat in stats"
            :key="stat.key"
            :label="stat.label"
            :value="player[stat.key]"
            :color="teamStyle?.bgColorHex"
        />
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
import { usePlayerPage } from '../../../utils/playerPageUtils'

import StatBox from './StatBox.vue'
import PlayerChart from './PlayerChart.vue'
import { getPlayerImage, handleImageError } from '../../../utils/playerImage'
import { getTeamLogo } from '../../../utils/getTeamLogo'


type Player = {
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

type StatKey = keyof Pick<
    Player,
    'PTS' | 'REB' | 'AST' | 'STL' | 'BLK' | 'TOV'
>


const route = useRoute()
const { players, fetchPlayerStats } = usePlayerStats()

onMounted(() => {
  if (!players.value.length) fetchPlayerStats()
})


const player = computed<Player | undefined>(() => {
  const name = decodeURIComponent(route.params.name as string)
  return players.value.find(p => p.PLAYER_NAME === name)
})


const {
  teamFullName,
  teamStyle,
  cardStyle
} = usePlayerPage(player)


const hasTeam = computed(() => !!teamFullName.value && !!teamStyle.value)


const stats: { label: string; key: StatKey }[] = [
  { label: 'PPG', key: 'PTS' },
  { label: 'RPG', key: 'REB' },
  { label: 'APG', key: 'AST' },
  { label: 'SPG', key: 'STL' },
  { label: 'BPG', key: 'BLK' },
  { label: 'TOV', key: 'TOV' },
]
</script>