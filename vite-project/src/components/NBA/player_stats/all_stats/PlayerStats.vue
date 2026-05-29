<template>
  <div class="mx-auto w-full max-w-6xl space-y-5 pb-6 text-left sm:space-y-8 sm:p-4">

    <div class="flex justify-center mb-4">
      <img
          src="/logos/PLAYERS_STATS.svg"
          alt="NBA Regular Season"
          class="w-32 object-contain sm:w-40 md:w-60"
      />
    </div>

    <div class="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
    <div class="flex justify-center">
      <select
          v-model="season"
          class="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm sm:w-auto"
      >
        <option
            v-for="s in seasons"
            :key="s"
            :value="s"
        >
          {{ s }}
        </option>
      </select>
    </div>

    <div class="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
      <button
          @click="switchMode('regular')"
          class="rounded-lg px-4 py-2 text-sm font-medium transition"
          :class="mode === 'regular' ? 'bg-white shadow text-gray-950' : 'text-gray-500'"
      >
        Regular
      </button>

      <button
          @click="switchMode('playoffs')"
          class="rounded-lg px-4 py-2 text-sm font-medium transition"
          :class="mode === 'playoffs' ? 'bg-white shadow text-gray-950' : 'text-gray-500'"
      >
        Playoffs
      </button>
    </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 md:gap-6">
      <StatLeaders title="Points Per Game" stat="PTS" :players="players" />
      <StatLeaders title="Rebounds Per Game" stat="REB" :players="players" />
      <StatLeaders title="Assists Per Game" stat="AST" :players="players" />
      <StatLeaders title="Steals Per Game" stat="STL" :players="players" />
      <StatLeaders title="Blocks Per Game" stat="BLK" :players="players" />
    </div>

    <div class="flex flex-col gap-3 md:flex-row">
      <input
          v-model="search"
          placeholder="Search player..."
          class="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm"
      />
    </div>

    <div class="mt-3 text-center sm:text-left">
      <button
          @click="showTeams = !showTeams"
          class="rounded-xl bg-gray-200 px-4 py-2 text-sm font-medium transition hover:bg-gray-300"
      >
        Выбрать команду
      </button>

      <transition name="slide-fade">
        <div
            v-if="showTeams"
            class="mt-3 flex flex-wrap items-center justify-center gap-3 rounded-xl bg-white p-2 shadow-sm sm:justify-start"
        >

          <img
              :src="getTeamLogo('ALL_TEAMS')"
              alt="All Teams"
              class="h-14 w-14 cursor-pointer transition-opacity duration-200 sm:h-20 sm:w-20"
              :class="team !== '' ? 'opacity-70' : 'opacity-100'"
              @click="team = ''"
          />

          <div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <img
                v-for="t in teams"
                :key="t"
                :src="getTeamLogo(t)"
                :alt="t"
                class="h-9 w-9 cursor-pointer rounded transition-opacity duration-200 sm:h-10 sm:w-10"
                :class="team === '' ? 'opacity-100' : (team === t ? 'opacity-100' : 'opacity-40')"
                @click="team = t"
            />
          </div>
        </div>
      </transition>
    </div>

    <div v-if="loading" class="text-center">Loading...</div>

    <div v-else class="space-y-3 md:hidden">
      <button
          v-for="p in sortedPlayers.slice(0, 100)"
          :key="p.PLAYER_ID"
          type="button"
          class="w-full rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm transition active:scale-[0.99]"
          @click="handleClick(p)"
      >
        <div class="flex min-w-0 items-center gap-3">
          <img
              :src="getImage(p)"
              :data-player-id="p.PLAYER_ID"
              class="h-11 w-11 shrink-0 rounded-full object-cover"
              @error="handleImageErr"
          />

          <div class="min-w-0">
            <div class="truncate font-semibold text-gray-900">{{ p.PLAYER_NAME }}</div>
            <div class="text-xs text-gray-500">{{ p.TEAM_ABBREVIATION }}</div>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-3 gap-2">
          <div
              v-for="item in mobileStats(p)"
              :key="item.label"
              class="rounded-lg bg-gray-50 px-2 py-1.5 text-center"
          >
            <div class="text-[10px] font-semibold uppercase text-gray-400">{{ item.label }}</div>
            <div class="text-sm font-semibold text-gray-900">{{ item.value }}</div>
          </div>
        </div>
      </button>
    </div>

    <div v-if="!loading" class="hidden overflow-x-auto rounded-xl border md:block">
      <table class="min-w-[760px] w-full text-sm">

        <thead class="bg-gray-900 text-white">
        <tr>
          <th class="p-2 text-left">Player</th>
          <th>Team</th>
          <th @click="toggleSort('PTS')" class="cursor-pointer">
            PTS {{ sortArrow('PTS') }}
          </th>
          <th @click="toggleSort('REB')" class="cursor-pointer">
            REB {{ sortArrow('REB') }}
          </th>
          <th @click="toggleSort('AST')" class="cursor-pointer">
            AST {{ sortArrow('AST') }}
          </th>
          <th @click="toggleSort('STL')" class="cursor-pointer">
            STL {{ sortArrow('STL') }}
          </th>
          <th @click="toggleSort('BLK')" class="cursor-pointer">
            BLK {{ sortArrow('BLK') }}
          </th>
        </tr>
        </thead>

        <tbody>
        <tr
            v-for="p in sortedPlayers.slice(0, 100)"
            :key="p.PLAYER_ID"
            class="border-b cursor-pointer hover:bg-gray-100"
            @click="handleClick(p)"
        >
          <td class="p-2">
            <div class="group/player flex items-center gap-2">
              <img
                  :src="getImage(p)"
                  :data-player-id="p.PLAYER_ID"
                  class="w-10 h-10 rounded-full object-cover"
                  @error="handleImageErr"
              />
              <span>{{ p.PLAYER_NAME }}</span>
              <span class="hidden md:inline-flex md:opacity-0 md:group-hover/player:opacity-100">
                <FavoritePlayerButton
                    :player="p"
                    size="sm"
                />
              </span>
            </div>
          </td>

          <td>{{ p.TEAM_ABBREVIATION }}</td>
          <td>{{ p.PTS }}</td>
          <td>{{ p.REB }}</td>
          <td>{{ p.AST }}</td>
          <td>{{ p.STL }}</td>
          <td>{{ p.BLK }}</td>
        </tr>
        </tbody>

      </table>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayerStats } from '../../../../composables/NBA/player_stats/usePlayerStats.ts'
import { getPlayerImage, handleImageError } from '../../../../utils/playerImage.ts'
import { useSorting } from '../../../../utils/useSorting.ts'
import { goToPlayer as navigateToPlayer } from '../../../../utils/playerRoutes.ts'
import StatLeaders from './StatLeaders.vue'
import { getTeamLogo } from '../../../../utils/getTeamLogo.ts'
import FavoritePlayerButton from '../../Favorites/FavoritePlayerButton.vue'

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
const seasons = [
  '2025-26',
  '2024-25',
  '2023-24',
  '2022-23',
  '2021-22'
]

const season = ref(seasons[0])

const router = useRouter()
const route = useRoute()

const mode = computed(() => {
  return route.path.includes('playoffs') ? 'playoffs' : 'regular'
})

const switchMode = (newMode: 'regular' | 'playoffs') => {
  if (newMode === 'playoffs') {
    router.push('/player-stats/playoffs')
  } else {
    router.push('/player-stats')
  }
}
const {
  loading,
  fetchPlayerStats,
  search,
  team,
  teams,
  filteredPlayers
} = usePlayerStats(season)

const showTeams = ref(false)


watch(
    () => route.path,
    () => {
      fetchPlayerStats()
    },
    { immediate: true }
)

watch(season, () => {
  fetchPlayerStats()
})

const players = computed<Player[]>(() => filteredPlayers.value)

const { toggleSort, sortArrow, sortedItems: sortedPlayers } =
    useSorting<Player, 'PTS' | 'REB' | 'AST' | 'STL' | 'BLK' | 'TOV'>(players, 'PTS')

const handleClick = (p: Player) => navigateToPlayer(router, p.PLAYER_NAME)

const getImage = getPlayerImage
const handleImageErr = handleImageError

const mobileStats = (p: Player) => [
  { label: 'PTS', value: p.PTS },
  { label: 'REB', value: p.REB },
  { label: 'AST', value: p.AST },
  { label: 'STL', value: p.STL },
  { label: 'BLK', value: p.BLK },
  { label: 'TOV', value: p.TOV },
]
</script>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  max-height: 0;
  opacity: 0;
}
.slide-fade-enter-to,
.slide-fade-leave-from {
  max-height: 500px;
  opacity: 1;
}

@media (max-width: 640px) {
  .team-logos img {
    width: 32px;
    height: 32px;
  }
}
</style>