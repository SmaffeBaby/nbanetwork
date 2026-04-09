<template>
  <div class="p-6 space-y-6">

    <div class="flex justify-center">
      <img :src="getTeamLogo(teamAbbr)" class="w-32 h-32" />
    </div>

    <input
        v-model="search"
        placeholder="Search player..."
        class="p-2 border rounded w-full"
    />

    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">

        <thead class="bg-gray-900 text-white">
        <tr>
          <th class="p-2 text-left">Player</th>
          <th @click="toggleSort('PTS')" class="cursor-pointer">
            PTS {{ sortArrow('PTS') }}
          </th>
          <th @click="toggleSort('REB')" class="cursor-pointer">
            REB {{ sortArrow('REB') }}
          </th>
          <th @click="toggleSort('AST')" class="cursor-pointer">
            AST {{ sortArrow('AST') }}
          </th>
        </tr>
        </thead>

        <tbody>
        <tr
            v-for="p in sortedPlayers"
            :key="p.PLAYER_ID"
            class="border-b hover:bg-gray-100"
        >
          <td class="p-2 flex items-center gap-2">
            <img :src="getImage(p)" class="w-8 h-8 rounded-full" />
            {{ p.PLAYER_NAME }}
          </td>
          <td>{{ p.PTS }}</td>
          <td>{{ p.REB }}</td>
          <td>{{ p.AST }}</td>
        </tr>
        </tbody>

      </table>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed, onMounted } from 'vue'
import { useTeamDetail } from '../../../../composables/NBA/Teams/TeamsDetail/useTeamDetail'
import { getPlayerImage } from '../../../../utils/playerImage'
import { getTeamLogo } from '../../../../utils/getTeamLogo'
import { useSorting } from '../../../../utils/useSorting'

const route = useRoute()
const teamAbbr = route.params.abbr as string

const {
  players,
  loading,
  search,
  fetchPlayers
} = useTeamDetail(teamAbbr)

onMounted(fetchPlayers)

const filteredPlayers = computed(() =>
    players.value.filter(p =>
        p.PLAYER_NAME.toLowerCase().includes(search.value.toLowerCase())
    )
)

type SortKey = 'PTS' | 'REB' | 'AST'

const { toggleSort, sortArrow, sortedItems: sortedPlayers } =
    useSorting<typeof filteredPlayers.value[number], SortKey>(
        filteredPlayers,
        'PTS'
    )



const getImage = getPlayerImage
</script>