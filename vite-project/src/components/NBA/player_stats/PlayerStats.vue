<template>
  <div class="p-4 space-y-8">

    <h1 class="text-2xl font-bold text-center">
      NBA Player Stats 2025–26
    </h1>

    <div class="grid md:grid-cols-2 gap-6">
      <StatLeaders title="Points Per Game" stat="PTS" :players="players" />
      <StatLeaders title="Rebounds Per Game" stat="REB" :players="players" />
      <StatLeaders title="Assists Per Game" stat="AST" :players="players" />
      <StatLeaders title="Steals Per Game" stat="STL" :players="players" />
      <StatLeaders title="Blocks Per Game" stat="BLK" :players="players" />
    </div>

    <div class="flex flex-col gap-3 md:flex-row">
      <input v-model="search" placeholder="Search player..." class="p-2 border rounded w-full" />

      <select v-model="team" class="p-2 border rounded">
        <option value="">All Teams</option>
        <option v-for="t in teams" :key="t">{{ t }}</option>
      </select>
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
            :key="p.PLAYER_NAME"
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
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStats } from '../../../composables/NBA/player_stats/usePlayerStats'
import { getPlayerImage, handleImageError } from '../../../utils/playerImage'
import { useSorting } from '../../../utils/useSorting'
import { goToPlayer as navigateToPlayer } from '../../../utils/playerRoutes'
import StatLeaders from './StatLeaders.vue'

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

const router = useRouter()
const {
  loading,
  fetchPlayerStats,
  search,
  team,
  teams,
  filteredPlayers
} = usePlayerStats()

onMounted(fetchPlayerStats)

const players = computed<Player[]>(() => filteredPlayers.value)

const { toggleSort, sortArrow, sortedItems: sortedPlayers } =
    useSorting<Player, 'PTS' | 'REB' | 'AST' | 'STL' | 'BLK' | 'TOV'>(players, 'PTS')

const handleClick = (p: Player) => navigateToPlayer(router, p.PLAYER_NAME)

const getImage = getPlayerImage
const handleImageErr = handleImageError
</script>