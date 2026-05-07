<template>
  <div class="p-4 space-y-6">

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
          <div class="group/player flex items-center gap-2">
            <h1 class="text-2xl font-bold drop-shadow-md" style="color: white">
              {{ player.PLAYER_NAME }}
            </h1>
            <FavoritePlayerButton
                :player="player"
                size="md"
                class="md:opacity-0 md:group-hover/player:opacity-100"
            />
          </div>

          <div
              v-if="hasTeam"
              @click="goToTeam"
              class="flex items-center gap-2 px-3 py-1 rounded-full font-semibold text-white
         cursor-pointer select-none
         transition-all duration-200
         hover:scale-105 hover:shadow-md active:scale-95"
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

      <div class="flex items-center gap-3 p-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm">

        <button
            @click="$router.back()"
            class="group inline-flex items-center gap-2 px-4 py-2 rounded-xl
           bg-white/10 text-black text-sm font-medium
           border border-white/20 shadow-sm
           hover:bg-white/20 hover:shadow-md hover:-translate-y-0.5
           active:scale-95 transition-all duration-200"
        >
          <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>

          Back
        </button>

        <div class="w-px h-6 bg-white/20"></div>

        <div class="relative group">

          <select
              v-model="season"
              class="appearance-none px-4 py-2 pr-8 rounded-xl
             bg-white/10 text-black text-sm font-medium
             border border-white/20 shadow-sm
             hover:bg-white/20 cursor-pointer
             transition-all duration-200"
          >
            <option
                v-for="s in seasons"
                :key="s"
                :value="s"
            >
              {{ s }}
            </option>
          </select>

          <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg
                class="w-4 h-4 text-black/60 group-hover:rotate-180 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div class="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100
                transition duration-300 pointer-events-none
                bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl"></div>

        </div>

      </div>

      <div
          v-if="careerTeams.length"
          class="bg-white p-4 rounded-2xl shadow space-y-3"
      >
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-semibold">Career</h2>

          <button
              v-if="careerTeams.length > visibleCareerLimit"
              @click="careerExpanded = !careerExpanded"
              class="px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200 transition"
          >
            {{ careerExpanded ? 'Свернуть' : 'Показать все' }}
          </button>
        </div>

        <div class="grid gap-2">
          <div
              v-for="item in visibleCareerTeams"
              :key="`${item.startSeason}-${item.endSeason}-${item.team}`"
              class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2"
          >
            <div class="flex items-center gap-2 min-w-0">
              <img
                  :src="getCareerTeamLogo(item.team)"
                  alt="Logo"
                  class="w-7 h-7 rounded-full object-contain bg-gray-50 shrink-0"
              />

              <span class="font-medium truncate">{{ item.team }}</span>
            </div>

            <span class="text-sm text-gray-500 shrink-0">
              {{ formatCareerYears(item) }}
            </span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatBox
            v-for="statKey in ['PTS','REB','AST','STL','BLK','TOV']"
            :key="seasonTypeFilter + team + filteredGames.length"
            :label="statKey"
            :games="filteredGames.map(g => ({
    [statKey]: (g[statKey as keyof Pick<GameRaw, 'PTS' | 'REB' | 'AST' | 'STL' | 'BLK' | 'TOV'>] ?? 0)
  }))"
            :color="teamStyle?.bgColorHex"
        />
      </div>

      <div class="bg-white p-4 rounded-2xl shadow">
        <h2 class="font-semibold mb-2">Performance Trend</h2>
        <PlayerChart
            :player-id="player.PLAYER_ID"
            :season="season"
            :team="team"
            :season-type="seasonTypeFilter"
        />
      </div>

      <div class="mt-2">
        <button
            @click="showTeams = !showTeams"
            class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
        >
          Выбрать команду
        </button>

        <transition name="slide-fade">
          <div
              v-if="showTeams"
              class="flex flex-wrap items-center gap-3 mt-3 p-2 rounded-md"
          >

            <img
                :src="getTeamLogo('ALL_TEAMS')"
                class="cursor-pointer w-16 h-16"
                :class="team !== '' ? 'opacity-50' : 'opacity-100'"
                @click="team = ''"
            />

            <img
                v-for="t in teams"
                :key="t"
                :src="getTeamLogo(t)"
                class="w-8 h-8 cursor-pointer rounded"
                :class="team === '' ? 'opacity-100' : (team === t ? 'opacity-100' : 'opacity-40')"
                @click="team = t"
            />
          </div>
        </transition>
      </div>

      <div v-if="filteredGames.length" class="bg-white p-4 rounded-2xl shadow">
        <PlayerRecentGames :games="filteredGames" :team="team" v-model:seasonTypeFilter="seasonTypeFilter" />
      </div>

    </div>

    <div v-else class="text-center">Loading player...</div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'

import { usePlayerStats } from '../../../../composables/NBA/player_stats/usePlayerStats'
import { usePlayerPage } from '../../../../composables/NBA/player_stats/usePlayerPage'
import { usePlayerGames } from '../../../../composables/NBA/player_stats/usePlayerGames'
import { useCurrentSeason } from '../../../../composables/NBA/useCurrentSeason'
import { usePlayerCareer, type CareerTeam } from '../../../../composables/NBA/player_stats/usePlayerCareer'
import type { GameRaw } from '../../../../composables/NBA/player_stats/usePlayerGames'

import PlayerRecentGames from './PlayerRecentGames.vue'
import StatBox from './StatBox.vue'
import PlayerChart from './PlayerChart.vue'
import FavoritePlayerButton from '../../Favorites/FavoritePlayerButton.vue'

import { getPlayerImage, handleImageError } from '../../../../utils/playerImage'
import { getTeamLogo } from '../../../../utils/getTeamLogo'

const route = useRoute()
const router = useRouter()
const showTeams = ref(false)
const careerExpanded = ref(false)
const visibleCareerLimit = 4

function goToTeam() {
  if (!player.value?.TEAM_ABBREVIATION) return
  router.push(`/team/${player.value.TEAM_ABBREVIATION}`)
}

const { season, seasons: currentSeasons, fetchCurrentSeason } = useCurrentSeason()
const {
  careerPlayer,
  careerSeasons,
  careerTeams,
  latestSeason,
  fetchPlayerCareer,
} = usePlayerCareer()

const playerName = computed(() => decodeURIComponent(route.params.name as string))
const seasons = computed(() => careerSeasons.value.length ? careerSeasons.value : currentSeasons.value)


const { players, fetchPlayerStats, team, teams } = usePlayerStats(season)

const player = computed(() => {
  return players.value.find(p => p.PLAYER_NAME === playerName.value) ?? careerPlayer.value ?? undefined
})

onMounted(async () => {
  await Promise.all([
    fetchCurrentSeason(),
    fetchPlayerCareer(playerName.value),
  ])

  if (latestSeason.value && season.value !== latestSeason.value) {
    season.value = latestSeason.value
  }

})

watch(
    playerName,
    async (name) => {
      await fetchPlayerCareer(name)
      careerExpanded.value = false

      if (latestSeason.value) {
        season.value = latestSeason.value
      }
    }
)

const visibleCareerTeams = computed(() => {
  if (careerExpanded.value) return careerTeams.value
  return careerTeams.value.slice(0, visibleCareerLimit)
})

function formatCareerYears(item: CareerTeam) {
  return `${item.startYear}-${item.endYear}`
}

function getCareerTeamLogo(team: string) {
  const firstTeam = team.split(' / ')[0]
  return getTeamLogo(firstTeam)
}

const { filteredGames, seasonTypeFilter } =
    usePlayerGames(player, team, season)

const { teamFullName, teamStyle, cardStyle, hasTeam } =
    usePlayerPage(player)
</script>