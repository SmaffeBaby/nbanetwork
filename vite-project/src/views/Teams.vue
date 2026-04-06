<template>
  <div class="pt-28 px-8">
    <Header />
    <div class="teams-page">

      <div v-if="loading">Loading...</div>
      <div v-else-if="error">Error: {{ error }}</div>
      <Teams
          v-else
          :easternTeams="easternTeams"
          :westernTeams="westernTeams"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Teams from '../components/NBA/Teams/Teams.vue'
import { useTeams } from '../composables/NBA/Teams/useTeams'
import Header from "../components/Headers/Header.vue";

const season = '2025-26'
const { easternTeams, westernTeams, loading, error } = useTeams(season)
</script>

<style scoped>
.teams-page {
  padding: 20px;
}
</style>