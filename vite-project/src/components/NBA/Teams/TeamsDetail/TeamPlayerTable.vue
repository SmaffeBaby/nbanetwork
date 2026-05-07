<template>
  <div class="overflow-x-auto">
    <table class="min-w-full text-sm">
      <thead class="bg-gray-900 text-white">
      <tr>
        <th class="p-2 text-left">Player</th>
        <th>Team</th>
        <th @click="toggleSort('MIN')" class="cursor-pointer">
          MIN {{ sortArrow('MIN') }}
        </th>
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
          @click="goToPlayer(p)"
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
            <FavoritePlayerButton
                :player="p"
                size="sm"
                class="md:opacity-0 md:group-hover/player:opacity-100"
            />
          </div>
        </td>
        <td>{{ p.TEAM_ABBREVIATION }}</td>
        <td>{{ p.MIN }}</td>
        <td>{{ p.PTS }}</td>
        <td>{{ p.REB }}</td>
        <td>{{ p.AST }}</td>
        <td>{{ p.STL }}</td>
        <td>{{ p.BLK }}</td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSorting } from '../../../../utils/useSorting'
import { getPlayerImage, handleImageError } from '../../../../utils/playerImage'
import type { PlayerStats } from '../../../../composables/NBA/player_stats/usePlayerStats'
import { goToPlayer as navigateToPlayer } from '../../../../utils/playerRoutes'
import FavoritePlayerButton from '../../Favorites/FavoritePlayerButton.vue'

interface Props {
  players: PlayerStats[]
  search: string
}

const props = defineProps<Props>()
const router = useRouter()

const filteredPlayers = computed(() =>
    props.players.filter(p =>
        p.PLAYER_NAME.toLowerCase().includes(props.search.toLowerCase())
    )
)

type SortKey = 'MIN' | 'PTS' | 'REB' | 'AST' | 'STL' | 'BLK'

const { toggleSort, sortArrow, sortedItems: sortedPlayers } =
    useSorting<PlayerStats, SortKey>(filteredPlayers, 'PTS')

const goToPlayer = (p: PlayerStats) => {
  navigateToPlayer(router, p.PLAYER_NAME)
}

const getImage = getPlayerImage
const handleImageErr = handleImageError
</script>