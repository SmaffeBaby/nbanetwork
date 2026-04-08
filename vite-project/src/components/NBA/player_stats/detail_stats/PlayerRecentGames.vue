<template>
  <div class="bg-white p-4 rounded-2xl shadow space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="font-semibold">История игр</h2>

      <label class="flex items-center cursor-pointer">
        <input type="checkbox" class="sr-only" v-model="hideScores" />
        <div
            class="w-12 h-6 flex items-center bg-gray-300 rounded-full p-1 transition"
            :class="!hideScores ? 'bg-blue-500' : ''"
        >
          <div
              class="bg-white w-4 h-4 rounded-full shadow-md transform transition"
              :class="!hideScores ? 'translate-x-6' : ''"
          ></div>
        </div>
        <span class="ml-2 text-gray-700 text-sm">
          {{ hideScores ? 'W/L скрыты' : '' }}
        </span>
      </label>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">

        <thead class="border-b text-gray-500 text-xs uppercase">
        <tr>

          <th
              class="px-3 py-2 text-left cursor-pointer select-none"
              @click="sortBy('GAME_DATE')"
          >
            Date {{ getArrow('GAME_DATE') }}
          </th>

          <th class="px-3 py-2 text-left">Match</th>

          <th class="px-3 py-2 text-center">Result</th>

          <th
              v-for="col in statCols"
              :key="col"
              class="px-3 py-2 text-center cursor-pointer select-none"
              @click="sortBy(col)"
          >
            {{ col }} {{ getArrow(col) }}
          </th>
        </tr>
        </thead>

        <tbody>
        <tr
            v-for="(g, i) in sortedGames"
            :key="i"
            class="border-b hover:bg-gray-50 transition"
        >

          <td class="px-3 py-2 whitespace-nowrap">
            {{ g.GAME_DATE }}
          </td>

          <td class="px-3 py-2">
            <div class="flex items-center gap-2">
              <img
                  v-if="getHomeTeamAbbr(g)"
                  :src="getTeamLogo(getHomeTeamAbbr(g)!)"
                  class="w-5 h-5"
              />
              <span class="text-gray-400 text-xs">vs</span>
              <img
                  v-if="getAwayTeamAbbr(g)"
                  :src="getTeamLogo(getAwayTeamAbbr(g)!)"
                  class="w-5 h-5"
              />
            </div>
          </td>

          <td class="px-3 py-2 text-center font-semibold">
            <template v-if="!hideScores">
            <span
                v-if="getWinLoss(g)"
                :class="getWinLoss(g) === 'W' ? 'text-green-600' : 'text-red-500'"
            >
              {{ getWinLoss(g) }}
            </span>
              <span v-else>-</span>
            </template>

            <template v-else>
              {{ g.HOME_SCORE }} - {{ g.AWAY_SCORE }}
            </template>
          </td>

          <td
              v-for="col in statCols"
              :key="col"
              class="px-3 py-2 text-center"
              :class="col === 'PTS' && (g.PTS ?? 0) >= 25 ? 'text-green-600 font-bold' : ''"
          >
            {{ g[col] ?? '-' }}
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <div v-if="sortedGames.length === 0" class="text-gray-400">
      No games yet
    </div>
  </div>
</template>

<script setup lang="ts">
import { getTeamLogo } from '../../../../utils/getTeamLogo.ts'
import type {
  GameRaw,
  SortKey
} from '../../../../composables/NBA/player_stats/usePlayerRecentGames.ts'
import { usePlayerRecentGames } from '../../../../composables/NBA/player_stats/usePlayerRecentGames.ts'

const props = defineProps<{ games: GameRaw[] }>()

const {
  hideScores,
  sortField,
  sortAsc,
  sortBy,
  getHomeTeamAbbr,
  getAwayTeamAbbr,
  getWinLoss,
  sortedGames
} = usePlayerRecentGames(props.games)

const statCols: SortKey[] = ['MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TOV']

const getArrow = (field: SortKey) => {
  if (sortField.value !== field) return ''
  return sortAsc.value ? '↑' : '↓'
}
</script>

<style scoped>
thead th {
  position: sticky;
  top: 0;
  background: white;
}
</style>