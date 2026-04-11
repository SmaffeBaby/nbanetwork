<template>
  <div class="p-6 space-y-6">

    <div class="flex justify-center mb-4">
      <img :src="getTeamLogo(teamAbbr)" class="w-72 h-72" />
    </div>

    <button
        @click="$router.back()"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl
             bg-white/10 backdrop-blur-md text-black text-sm font-medium
             border border-white/20 shadow-sm
             hover:bg-white/20 hover:shadow-md hover:-translate-y-0.5
             active:scale-95 transition-all duration-200"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>

    <div class="mt-6 border-b border-gray-300">
      <nav class="-mb-px flex space-x-4">
        <button
            v-for="tab in tabs"
            :key="tab"
            @click="activeTab = tab"
            class="px-3 py-2 font-medium text-sm rounded-t-lg"
            :class="activeTab === tab
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'"
        >
          {{ tab }}
        </button>
      </nav>
    </div>

    <div class="mt-4">
      <TeamUpcomingGames
          v-if="activeTab === 'Будущие игры'"
          :teamId="teamId"
      />
      <TeamGamesTable
          v-if="activeTab === 'История игр'"
          :teamId="teamId"
          season="2025-26"
      />
      <TeamStats v-if="activeTab === 'Команда'" :teamAbbr="teamAbbr" />
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

import TeamStats from './TeamStats.vue'
import TeamGamesTable from './TeamGamesTable.vue'
import TeamUpcomingGames from './TeamUpcomingGames.vue'

import { getTeamLogo } from '../../../../utils/getTeamLogo'
import { TEAM_ID_MAP } from '../../../../constants/nbaTeams'

const route = useRoute()
const teamAbbr = route.params.abbr as string

const tabs = ['Будущие игры','Команда', 'История игр']
const activeTab = ref('Команда')

const teamId = computed(() => TEAM_ID_MAP[teamAbbr])
</script>