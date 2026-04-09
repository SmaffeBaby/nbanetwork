<template>
  <div class="p-6 space-y-8">

    <form class="max-w-md mx-auto" @submit.prevent>
      <div class="relative">
        <input
            v-model="searchQuery"
            type="search"
            placeholder="Найти команду..."
            class="block w-full p-3 border border-gray-600 text-black rounded-xl"
        />
      </div>
    </form>

    <ConferenceSwitcher
        :activeConference="activeConference"
        :setConference="setConference"
    />

    <div v-if="loading" class="text-center">Loading...</div>
    <div v-else-if="error" class="text-red-500 text-center">
      Error: {{ error }}
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <TeamCard
          v-for="team in filteredTeams"
          :key="team[2] || team.TeamID"
          :team="team"
          :getLogo="getLogo"
          :getFullName="getFullName"
          :getRecord="getRecord"
          :getTeamStyle="getTeamStyle"
          @select="goToTeam"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTeams } from '../../../composables/NBA/Teams/useTeams'
import { getTeamAbbr, getTeamStyle } from '../../../composables/NBA/Teams/useTeamUtils'

import TeamCard from './TeamCard.vue'
import ConferenceSwitcher from './ConferenceSwitcher.vue'

const router = useRouter()

const goToTeam = (team: any) => {
  router.push({
    name: 'TeamDetail',
    params: { abbr: getTeamAbbr(team) }
  })
}

const { getTeams, getLogo, getFullName, getRecord, loading, error } = useTeams()

const activeConference = ref<'East' | 'West' | 'All'>('East')
const searchQuery = ref('')

const filteredTeams = computed(() => {
  let teams = activeConference.value === 'All'
      ? [...getTeams('East'), ...getTeams('West')]
      : getTeams(activeConference.value)

  if (!searchQuery.value) return teams

  return teams.filter(team =>
      getFullName(team).toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const setConference = (conf: 'East' | 'West' | 'All') => {
  activeConference.value = conf
}
</script>