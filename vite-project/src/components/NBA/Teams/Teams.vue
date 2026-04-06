<template>
  <div class="p-6 space-y-8">

    <form class="max-w-md mx-auto" @submit.prevent>
      <label for="search" class="sr-only">Search</label>
      <div class="relative">
        <input
            v-model="searchQuery"
            type="search"
            id="search"
            placeholder="Найти команду..."
            class="block w-full p-3 ps-10 bg-white-800 border border-gray-600 text-white text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
        />
      </div>
    </form>

    <ConferenceSwitcher
        :activeConference="activeConference"
        :setConference="setConference"
    />

    <div v-if="loading" class="text-gray-400 text-center">Loading...</div>
    <div v-else-if="error" class="text-red-500 text-center">Error: {{ error }}</div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <TeamCard
          v-for="team in filteredTeams"
          :key="team[2] || team.TeamID"
          :team="team"
          :getLogo="getLogo"
          :getFullName="getFullName"
          :getRecord="getRecord"
          :getTeamStyle="getTeamStyle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTeams } from '../../../composables/NBA/Teams/useTeams'
import TeamCard from './TeamCard.vue'
import ConferenceSwitcher from './ConferenceSwitcher.vue'
import { getTeamAbbr, getTeamStyle } from '../../../composables/NBA/Teams/useTeamUtils'

const { getTeams, getLogo, getFullName, getRecord, loading, error } = useTeams()

const activeConference = ref<'East' | 'West' | 'All'>('East')
const searchQuery = ref('')

const filteredTeams = computed(() => {
  let teams = []
  if (activeConference.value === 'All') {
    teams = [...getTeams('East'), ...getTeams('West')]
  } else {
    teams = getTeams(activeConference.value)
  }

  if (!searchQuery.value) return teams

  return teams.filter(team =>
      getFullName(team).toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const setConference = (conf: 'East' | 'West' | 'All') => {
  activeConference.value = conf
}
</script>