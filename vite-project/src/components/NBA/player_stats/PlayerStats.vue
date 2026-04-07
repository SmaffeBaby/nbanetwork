<template>
  <div class="p-4 space-y-6">

    <h1 class="text-2xl font-bold text-center">
      NBA Player Stats 2025–26
    </h1>

    <div class="flex flex-col gap-3 md:flex-row">

      <input
          v-model="search"
          placeholder="Search player..."
          class="p-2 border rounded w-full"
      />

      <select v-model="team" class="p-2 border rounded">
        <option value="">All Teams</option>
        <option v-for="t in teams" :key="t">
          {{ t }}
        </option>
      </select>

      <select v-model="sortBy" class="p-2 border rounded">
        <option value="PTS">Points</option>
        <option value="REB">Rebounds</option>
        <option value="AST">Assists</option>
        <option value="STL">Steals</option>
        <option value="BLK">Blocks</option>
        <option value="TOV">Turnovers</option>
      </select>

    </div>

    <div v-if="loading" class="text-center">
      Loading...
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">

        <thead class="bg-gray-900 text-white">
        <tr>
          <th class="p-2 text-left">Player</th>
          <th>Team</th>
          <th>PTS</th>
          <th>REB</th>
          <th>AST</th>
          <th>STL</th>
          <th>BLK</th>
        </tr>
        </thead>

        <tbody>
        <tr
            v-for="p in filteredPlayers.slice(0, 100)"
            :key="p.PLAYER_NAME"
            class="border-b cursor-pointer hover:bg-gray-100"
            @click="goToPlayer(p)"
        >
          <td class="p-2">{{ p.PLAYER_NAME }}</td>
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
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStats } from '../../../composables/NBA/player_stats/usePlayerStats'

const router = useRouter()

const {
  loading,
  fetchPlayerStats,
  search,
  team,
  sortBy,
  teams,
  filteredPlayers
} = usePlayerStats()

const goToPlayer = (p: any) => {
  router.push(`/player/${encodeURIComponent(p.PLAYER_NAME)}`)
}

onMounted(fetchPlayerStats)
</script>