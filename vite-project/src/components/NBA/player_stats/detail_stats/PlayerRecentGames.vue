<template>
  <div class="bg-white p-4 rounded-2xl shadow space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="font-semibold">История игр</h2>

      <label class="flex items-center cursor-pointer">
        <div class="relative">
          <input type="checkbox" class="sr-only" v-model="hideScores" />
          <div
              class="block w-14 h-8 rounded-full transition-all"
              :class="hideScores ? 'bg-gray-300' : 'bg-blue-500'"
          ></div>
          <div
              class="dot absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow transition"
              :class="hideScores ? '' : 'translate-x-6'"
          ></div>
        </div>
        <span class="ml-2 text-gray-700">{{ hideScores ? 'W/L скрыты' : '' }}</span>
      </label>
    </div>

    <div class="flex gap-2 text-sm text-gray-600 mb-2">
      <span>Sort by:</span>
      <button
          v-for="field in sortableFields"
          :key="field.key"
          @click="sortBy(field.key)"
          class="px-2 py-1 border rounded hover:bg-gray-100"
      >
        {{ field.label }}
      </button>
    </div>

    <div v-if="sortedGames.length === 0" class="text-gray-400">
      No games yet
    </div>

    <div
        v-for="(g, i) in sortedGames"
        :key="i"
        class="p-3 rounded-xl border flex flex-col gap-2"
    >
      <div class="flex justify-between text-sm text-gray-500">
        <span>{{ g.GAME_DATE }}</span>

        <span class="font-bold">
          <template v-if="!hideScores">
            {{ getWinLoss(g) }}
          </template>
          <template v-else-if="g.HOME_SCORE !== undefined && g.AWAY_SCORE !== undefined">
            {{ g.HOME_SCORE }} - {{ g.AWAY_SCORE }}
          </template>
        </span>
      </div>

      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <img
              v-if="getHomeTeamAbbr(g)"
              :src="getTeamLogo(getHomeTeamAbbr(g)!)"
              :alt="getHomeTeamAbbr(g)"
              class="w-6 h-6 rounded"
          />
          <div v-else class="w-6 h-6 bg-gray-300 rounded"></div>

          <img
              v-if="getAwayTeamAbbr(g)"
              :src="getTeamLogo(getAwayTeamAbbr(g)!)"
              :alt="getAwayTeamAbbr(g)"
              class="w-6 h-6 rounded"
          />
          <div v-else class="w-6 h-6 bg-gray-300 rounded"></div>
        </div>

        <div class="flex gap-3 text-sm">
          <span v-if="g.PTS !== undefined">PTS: {{ g.PTS }}</span>
          <span v-if="g.REB !== undefined">REB: {{ g.REB }}</span>
          <span v-if="g.AST !== undefined">AST: {{ g.AST }}</span>
          <span v-if="g.STL !== undefined">STL: {{ g.STL }}</span>
          <span v-if="g.BLK !== undefined">BLK: {{ g.BLK }}</span>
          <span v-if="g.TOV !== undefined">TOV: {{ g.TOV }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getTeamLogo } from '../../../../utils/getTeamLogo.ts'
import type { GameRaw } from '../../../../composables/NBA/player_stats/usePlayerRecentGames.ts'
import { usePlayerRecentGames } from '../../../../composables/NBA/player_stats/usePlayerRecentGames.ts'

const props = defineProps<{ games: GameRaw[] }>()

const {
  hideScores,
  sortableFields,
  sortBy,
  getHomeTeamAbbr,
  getAwayTeamAbbr,
  getWinLoss,
  sortedGames
} = usePlayerRecentGames(props.games)
</script>