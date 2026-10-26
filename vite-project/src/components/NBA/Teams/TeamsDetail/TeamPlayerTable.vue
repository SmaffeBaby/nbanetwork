<template>
  <div class="space-y-3">
    <div class="space-y-3 md:hidden">
      <button
          v-for="p in sortedPlayers.slice(0, 100)"
          :key="p.PLAYER_ID"
          type="button"
          class="w-full rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm transition active:scale-[0.99]"
          @click="goToPlayer(p)"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="group/player flex min-w-0 items-center gap-3">
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
            <FavoritePlayerButton
                :player="p"
                size="sm"
                class="shrink-0"
            />
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

    <div class="hidden overflow-x-auto rounded-xl border md:block">
    <table class="min-w-[760px] w-full text-sm">
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

const mobileStats = (p: PlayerStats) => [
  { label: 'MIN', value: p.MIN },
  { label: 'PTS', value: p.PTS },
  { label: 'REB', value: p.REB },
  { label: 'AST', value: p.AST },
  { label: 'STL', value: p.STL },
  { label: 'BLK', value: p.BLK },
]
</script>
