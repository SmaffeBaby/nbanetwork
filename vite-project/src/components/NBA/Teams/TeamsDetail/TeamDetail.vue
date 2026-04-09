<template>
  <div class="p-6 space-y-6">

    <div class="flex justify-center">
      <img :src="getTeamLogo(teamAbbr)" class="w-32 h-32" />
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <StatLeaders title="Points Per Game" stat="PTS" :players="players" />
      <StatLeaders title="Rebounds Per Game" stat="REB" :players="players" />
      <StatLeaders title="Assists Per Game" stat="AST" :players="players" />
      <StatLeaders title="Steals Per Game" stat="STL" :players="players" />
      <StatLeaders title="Blocks Per Game" stat="BLK" :players="players" />
    </div>

    <input
        v-model="search"
        placeholder="Search player..."
        class="p-2 border rounded w-full"
    />

    <div v-if="loading" class="text-center">Loading...</div>

    <div v-else class="overflow-x-auto">
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
import { useRoute, useRouter } from 'vue-router'
import { computed, onMounted } from 'vue'
import { useTeamDetail } from '../../../../composables/NBA/Teams/TeamsDetail/useTeamDetail'
import { getPlayerImage, handleImageError } from '../../../../utils/playerImage'
import { getTeamLogo } from '../../../../utils/getTeamLogo'
import { useSorting } from '../../../../utils/useSorting'
import { goToPlayer as navigateToPlayer } from '../../../../utils/playerRoutes'
import type { PlayerStats } from '../../../../composables/NBA/player_stats/usePlayerStats'
import StatLeaders from '../../player_stats/all_stats/StatLeaders.vue'

const route = useRoute()
const router = useRouter()

const teamAbbr = route.params.abbr as string

const {
  players,
  loading,
  search,
  fetchPlayers
} = useTeamDetail(teamAbbr)

onMounted(fetchPlayers)

const filteredPlayers = computed<PlayerStats[]>(() =>
    players.value.filter(p =>
        p.PLAYER_NAME.toLowerCase().includes(search.value.toLowerCase())
    )
)

type SortKey = 'PTS' | 'REB' | 'AST' | 'STL' | 'BLK'

const { toggleSort, sortArrow, sortedItems: sortedPlayers } =
    useSorting<PlayerStats, SortKey>(filteredPlayers, 'PTS')

const handleClick = (p: PlayerStats) =>
    navigateToPlayer(router, p.PLAYER_NAME)

const getImage = getPlayerImage
const handleImageErr = handleImageError
</script>