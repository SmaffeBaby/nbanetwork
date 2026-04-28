<template>
  <div class="text-white space-y-4">

    <div class="flex items-center gap-3">
      <label class="text-sm text-gray-300">Season:</label>

      <select
          v-model="selectedSeason"
          class="px-3 py-2 rounded-lg bg-white text-black text-sm border shadow-sm"
      >
        <option v-for="s in seasons" :key="s" :value="s">
          {{ s }}
        </option>
      </select>
    </div>

    <div v-if="series.length" class="space-y-3">

      <div
          v-for="(s, idx) in series"
          :key="s.key"
          class="bg-white text-black rounded-2xl shadow p-4"
      >

        <div
            class="flex justify-between items-center cursor-pointer"
            @click="toggleSeries(idx)"
        >
          <div class="font-semibold text-sm">
            {{ formatTeam(s.teamA) }} {{ getSeed(s.teamA) }}
            vs
            {{ formatTeam(s.teamB) }} {{ getSeed(s.teamB) }}

            <span class="ml-2 text-gray-500">
              ({{ getSeriesScore(s) }})
            </span>

            <span class="text-xs text-gray-500 ml-2">
              ({{ s.games.length }} games)
            </span>
          </div>

          <div class="text-xs text-gray-500">
            {{ s.games[0]?.GAME_DATE }}
          </div>
        </div>

        <div v-if="opened[idx]" class="mt-3 space-y-2">

          <div
              v-for="g in s.games"
              :key="g.GAME_ID"
              class="border rounded-lg p-3 flex justify-between items-center"
          >

            <div>
              <div class="font-semibold text-sm">
                {{ formatTeam(g.home.team) }} {{ getSeed(g.home.team) }}
                vs
                {{ formatTeam(g.away.team) }} {{ getSeed(g.away.team) }}
              </div>

              <div class="text-xs text-gray-500">
                {{ g.GAME_DATE }}
              </div>
            </div>

            <div class="flex gap-4 items-center text-sm">

              <div class="text-center">
                <div class="font-bold">{{ g.home.pts }}</div>
                <div :class="g.home.wl === 'W' ? 'text-green-600' : 'text-red-500'">
                  {{ g.home.wl }}
                </div>
              </div>

              <div class="text-gray-400">-</div>

              <div class="text-center">
                <div class="font-bold">{{ g.away.pts }}</div>
                <div :class="g.away.wl === 'W' ? 'text-green-600' : 'text-red-500'">
                  {{ g.away.wl }}
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

    <div v-else class="text-gray-400 text-sm">
      No playoff games
    </div>

  </div>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { usePlayoffGames } from '../../../composables/NBA/Playoffs/usePlayoffGames'

const {
  seasons,
  selectedSeason,
  series,
  opened,
  formatTeam,
  getSeed,
  getSeriesScore,
  toggleSeries,
  loadAll
} = usePlayoffGames()

onMounted(() => {
  if (selectedSeason.value) {
    loadAll(selectedSeason.value)
  }
})

watch(selectedSeason, (season) => {
  if (season) {
    loadAll(season)
  }
})
</script>