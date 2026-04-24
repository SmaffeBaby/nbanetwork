<template>
  <div class="p-4 space-y-8">

    <div class="flex justify-center mb-4">
      <img
          src="/logos/PLAYERS_STATS.svg"
          alt="NBA Regular Season"
          class="w-40 md:w-60 object-contain"
      />
    </div>

    <div class="grid md:grid-cols-2 gap-6">
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
          class="p-2 border rounded w-full"
      />
    </div>

    <div class="mt-3">
      <button
          @click="showTeams = !showTeams"
          class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
      >
        Выбрать команду
      </button>

      <transition name="slide-fade">
        <div
            v-if="showTeams"
            class="flex flex-wrap bg-gray-100  items-center gap-3 mt-3 overflow-x-auto p-2 bg-transparent rounded-md"
        >

          <img
              :src="getTeamLogo('ALL_TEAMS')"
              alt="All Teams"
              class="cursor-pointer transition-opacity duration-200 w-20 h-20"
              :class="team !== '' ? 'opacity-70' : 'opacity-100'"
              @click="team = ''"
          />

          <div class="flex flex-wrap items-center gap-2 ml-2">
            <img
                v-for="t in teams"
                :key="t"
                :src="getTeamLogo(t)"
                :alt="t"
                class="w-10 h-10 cursor-pointer rounded transition-opacity duration-200"
                :class="team === '' ? 'opacity-100' : (team === t ? 'opacity-100' : 'opacity-40')"
                @click="team = t"
            />
          </div>
        </div>
      </transition>
    </div>

    <div v-if="loading" class="text-center">Loading...</div>

    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">

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
            <div class="flex items-center gap-2">
              <img
                  :src="getImage(p)"
                  :data-player-id="p.PLAYER_ID"
                  class="w-10 h-10 rounded-full object-cover"
                  @error="handleImageErr"
              />
              {{ p.PLAYER_NAME }}
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStats } from '../../../../composables/NBA/player_stats/usePlayerStats.ts'
import { getPlayerImage, handleImageError } from '../../../../utils/playerImage.ts'
import { useSorting } from '../../../../utils/useSorting.ts'
import { goToPlayer as navigateToPlayer } from '../../../../utils/playerRoutes.ts'
import StatLeaders from './StatLeaders.vue'
import { getTeamLogo } from '../../../../utils/getTeamLogo.ts'

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
const season = ref('2025-26')
const router = useRouter()
const {
  loading,
  fetchPlayerStats,
  search,
  team,
  teams,
  filteredPlayers
} = usePlayerStats(season)

const showTeams = ref(false)


onMounted(fetchPlayerStats)

const players = computed<Player[]>(() => filteredPlayers.value)

const { toggleSort, sortArrow, sortedItems: sortedPlayers } =
    useSorting<Player, 'PTS' | 'REB' | 'AST' | 'STL' | 'BLK' | 'TOV'>(players, 'PTS')

const handleClick = (p: Player) => navigateToPlayer(router, p.PLAYER_NAME)

const getImage = getPlayerImage
const handleImageErr = handleImageError
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