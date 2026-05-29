<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="font-semibold">История игр</h2>

      <select
          v-model="seasonTypeFilter"
          class="min-w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
      >
        <option value="ALL">All</option>
        <option value="Regular">Regular</option>
        <option value="Playoffs">Playoffs</option>
      </select>
    </div>

    <label class="flex items-center cursor-pointer">
      <input type="checkbox" class="sr-only" v-model="hideScores" />

      <div
          class="w-12 h-6 flex items-center rounded-full p-1 transition"
          :class="hideScores ? 'bg-gray-300' : 'bg-blue-500'"
      >
        <div
            class="bg-white w-4 h-4 rounded-full shadow-md transform transition"
            :class="hideScores ? '' : 'translate-x-6'"
        ></div>
      </div>

      <span class="ml-2 text-gray-700 text-sm">
        {{ hideScores ? 'W/L скрыты' : '' }}
      </span>
    </label>

    <div class="space-y-3 sm:hidden">
      <button
          v-for="(g, i) in filteredGames"
          :key="g.Game_ID || i"
          type="button"
          class="w-full rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm transition active:scale-[0.99]"
          @click="goToGame(g.Game_ID)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium text-gray-800">{{ g.GAME_DATE }}</span>

              <span
                  v-if="g.SEASON_TYPE"
                  class="rounded-full px-2 py-[2px] text-[10px] font-semibold"
                  :class="g.SEASON_TYPE === 'Playoffs'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-200 text-gray-600'"
              >
                {{ g.SEASON_TYPE === 'Playoffs' ? 'PO' : 'RS' }}
              </span>
            </div>

            <div class="mt-2 flex items-center gap-2">
              <img
                  v-if="g.HOME_TEAM_ABBR"
                  :src="getTeamLogo(g.HOME_TEAM_ABBR)"
                  class="h-6 w-6 shrink-0"
                  alt=""
              />

              <span class="text-xs text-gray-400">vs</span>

              <img
                  v-if="g.AWAY_TEAM_ABBR"
                  :src="getTeamLogo(g.AWAY_TEAM_ABBR)"
                  class="h-6 w-6 shrink-0"
                  alt=""
              />
            </div>
          </div>

          <div class="shrink-0 text-right font-semibold">
            <span v-if="hideScores">
              {{ g.HOME_SCORE ?? '-' }} - {{ g.AWAY_SCORE ?? '-' }}
            </span>

            <span v-else :class="getWinLossClass(g)">
              {{ getWinLoss(g) || '-' }}
            </span>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-4 gap-2">
          <div
              v-for="col in statCols"
              :key="col"
              class="rounded-lg bg-gray-50 px-2 py-1.5 text-center"
          >
            <div class="text-[10px] font-semibold uppercase text-gray-400">{{ col }}</div>
            <div
                class="text-sm font-semibold text-gray-800"
                :class="col === 'PTS' && (g.PTS ?? 0) >= 25 ? 'text-green-600' : ''"
            >
              {{ g[col] ?? '-' }}
            </div>
          </div>
        </div>
      </button>
    </div>

    <div class="hidden overflow-x-auto sm:block">
      <table class="min-w-full text-sm">

        <thead class="border-b text-gray-500 text-xs uppercase">
        <tr>
          <th class="px-3 py-2 text-left cursor-pointer select-none" @click="sortBy('GAME_DATE')">
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
            v-for="(g, i) in filteredGames"
            :key="g.Game_ID || i"
            class="border-b hover:bg-gray-50 transition cursor-pointer active:scale-[0.99]"
            @click="goToGame(g.Game_ID)"
        >

          <td class="px-3 py-2 whitespace-nowrap">
            <div class="flex items-center gap-2">
              <span>{{ g.GAME_DATE }}</span>

              <span
                  v-if="g.SEASON_TYPE"
                  class="text-[10px] px-2 py-[2px] rounded-full font-semibold"
                  :class="g.SEASON_TYPE === 'Playoffs'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-200 text-gray-600'"
                        >
                {{ g.SEASON_TYPE === 'Playoffs' ? 'PO' : 'RS' }}
              </span>
            </div>
          </td>

          <td class="px-3 py-2">
            <div class="flex items-center gap-2">
              <img
                  v-if="g.HOME_TEAM_ABBR"
                  :src="getTeamLogo(g.HOME_TEAM_ABBR)"
                  class="w-5 h-5"
                  alt=""
              />

              <span class="text-gray-400 text-xs">vs</span>

              <img
                  v-if="g.AWAY_TEAM_ABBR"
                  :src="getTeamLogo(g.AWAY_TEAM_ABBR)"
                  class="w-5 h-5"
                  alt=""
              />
            </div>
          </td>

          <td class="px-3 py-2 text-center font-semibold">
              <span v-if="hideScores">
                {{ g.HOME_SCORE ?? '-' }} - {{ g.AWAY_SCORE ?? '-' }}
              </span>

            <span v-else :class="getWinLossClass(g)">
                {{ getWinLoss(g) || '-' }}
              </span>
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

    <div v-if="filteredGames.length === 0" class="text-gray-400">
      No games yet
    </div>
  </div>

</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { getTeamLogo } from '../../../../utils/getTeamLogo.ts'
import type { GameRaw, SortKey } from '../../../../composables/NBA/player_stats/usePlayerRecentGames.ts'
import { usePlayerRecentGames } from '../../../../composables/NBA/player_stats/usePlayerRecentGames.ts'

const router = useRouter()

const props = defineProps<{ games: GameRaw[]; team?: string }>()
const seasonTypeFilter = defineModel<'ALL' | 'Regular' | 'Playoffs'>('seasonTypeFilter')

const {
  hideScores,
  sortField,
  sortAsc,
  sortBy,
  getWinLoss,
  sortedGames
} = usePlayerRecentGames(toRef(props, 'games'))

const statCols: SortKey[] = ['MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TOV']

const getArrow = (field: SortKey) =>
    sortField.value === field ? (sortAsc.value ? '↑' : '↓') : ''

const getWinLossClass = (g: GameRaw) =>
    getWinLoss(g) === 'W' ? 'text-green-600' : 'text-red-500'

const goToGame = (gameId: string | number) => {
  if (!gameId) return
  router.push(`/game/${gameId}`)
}

const filteredGames = computed(() => {
  let games = sortedGames.value

  if (props.team) {
    games = games.filter(
        g =>
            g.HOME_TEAM_ABBR === props.team ||
            g.AWAY_TEAM_ABBR === props.team
    )
  }

  if (seasonTypeFilter.value !== 'ALL') {
    games = games.filter(g => g.SEASON_TYPE === seasonTypeFilter.value)
  }

  return games
})
</script>

<style scoped>
thead th {
  position: sticky;
  top: 0;
  background: white;
}
</style>