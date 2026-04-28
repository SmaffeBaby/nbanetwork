<template>
  <nav class="flex items-center gap-4">
    <RouterLink to="/standings" class="group relative">
      <img
          :src="route.path === '/standings'
          ? '/logos/RS2.svg'
          : '/logos/RS1.svg'"
          class="w-24 h-24 transition group-hover:opacity-0 absolute"
      />
      <img
          src="/logos/RS2.svg"
          class="w-24 h-24 transition opacity-0 group-hover:opacity-100"
      />
    </RouterLink>

    <RouterLink to="/playoffs" class="group relative">
      <img
          :src="route.path === '/playoffs'
          ? '/logos/PLAYOFFS_2.svg'
          : '/logos/PLAYOFFS_1.svg'"
          class="w-24 h-24 transition group-hover:opacity-0 absolute"
      />
      <img
          src="/logos/PLAYOFFS_2.svg"
          class="w-24 h-24 transition opacity-0 group-hover:opacity-100"
      />
    </RouterLink>

    <RouterLink to="/teams" class="group relative">
      <img
          :src="route.path === '/teams'
          ? '/logos/TEAMS2.svg'
          : '/logos/TEAMS.svg'"
          class="w-24 h-24 transition group-hover:opacity-0 absolute"
      />
      <img
          src="/logos/TEAMS2.svg"
          class="w-24 h-24 transition opacity-0 group-hover:opacity-100"
      />
    </RouterLink>

    <RouterLink to="/player-stats" class="group relative">
      <img
          :src="route.path === '/player-stats'
          ? '/logos/PLAYER_STATS_2.svg'
          : '/logos/PLAYER_STATS_1.svg'"
          class="w-24 h-24 transition group-hover:opacity-0 absolute"
      />
      <img
          src="/logos/PLAYER_STATS_2.svg"
          class="w-24 h-24 transition opacity-0 group-hover:opacity-100"
      />
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useRoute } from 'vue-router'

const route = useRoute()
</script>