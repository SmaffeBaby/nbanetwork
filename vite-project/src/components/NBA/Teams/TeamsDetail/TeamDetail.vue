<template>
  <div class="p-6 space-y-6">

    <div class="flex justify-center mb-4">
      <img :src="getTeamLogo(teamAbbr)" class="w-32 h-32" />
    </div>

    <div class="grid md:grid-cols-2 gap-6 mb-4">
      <StatLeaders title="Points Per Game" stat="PTS" :players="players" />
      <StatLeaders title="Rebounds Per Game" stat="REB" :players="players" />
      <StatLeaders title="Assists Per Game" stat="AST" :players="players" />
      <StatLeaders title="Steals Per Game" stat="STL" :players="players" />
      <StatLeaders title="Blocks Per Game" stat="BLK" :players="players" />
    </div>

    <input
        v-model="search"
        placeholder="Search player..."
        class="p-2 border rounded w-full mb-4"
    />

    <div v-if="loading" class="text-center">Loading...</div>

    <PlayerTable
        v-else
        :players="players"
        :search="search"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useTeamDetail } from '../../../../composables/NBA/Teams/TeamsDetail/useTeamDetail'
import { getTeamLogo } from '../../../../utils/getTeamLogo'
import StatLeaders from '../../player_stats/all_stats/StatLeaders.vue'
import PlayerTable from './TeamPlayerTable.vue'

import type { PlayerStats } from '../../../../composables/NBA/player_stats/usePlayerStats'

const route = useRoute()
const router = useRouter()
const teamAbbr = route.params.abbr as string

const { players, loading, search, fetchPlayers } = useTeamDetail(teamAbbr)
onMounted(fetchPlayers)
</script>