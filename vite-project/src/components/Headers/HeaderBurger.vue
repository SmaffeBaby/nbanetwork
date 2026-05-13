<template>
  <div class="sm:hidden fixed top-4 right-4 z-50">
    <button class="p-2 rounded bg-white shadow-lg hover:bg-gray-100 transition" @click="isOpen = !isOpen">
      <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path v-if="!isOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"/>
        <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
  </div>

  <transition name="slide">
    <div v-if="isOpen" class="fixed inset-0 z-40 flex">
      <div class="absolute inset-0 bg-black opacity-40" @click="isOpen = false"></div>

      <div class="relative ml-auto w-72 bg-white shadow-xl h-full flex flex-col gap-4 p-4">
        <RouterLink to="/" class="mb-4">
          <img src="/logos/logo-nba-mom.svg" alt="NBA Logo" class="w-36 object-contain"/>
        </RouterLink>

        <RouterLink
            to="/standings"
            @click="isOpen = false"
            class="flex items-center gap-3"
        >
          <img
              :src="route.path === '/standings'
              ? '/logos/RS2.svg'
              : '/logos/RS1.svg'"
              class="w-44 h-44"
              alt="Standings"
          />
        </RouterLink>

        <RouterLink
            to="/teams"
            @click="isOpen = false"
            class="flex items-center gap-3"
        >
          <img
              :src="route.path.startsWith('/teams')
              ? '/logos/TEAMS2.svg'
              : '/logos/TEAMS.svg'"
              class="w-44 h-44"
              alt="Teams"
          />
        </RouterLink>

        <RouterLink
            :to="gamesPath"
            @click="isOpen = false"
            class="flex items-center gap-3"
        >
          <img
              :src="route.path.startsWith('/games')
              ? '/logos/GAMES_2.svg'
              : '/logos/GAMES_1.svg'"
              class="w-44 h-44"
              alt="Games"
          />
        </RouterLink>

        <RouterLink
            to="/player-stats"
            @click="isOpen = false"
            class="flex items-center gap-3"
        >
          <img
              :src="route.path.startsWith('/player-stats')
              ? '/logos/PLAYER_STATS_2.svg'
              : '/logos/PLAYER_STATS_1.svg'"
              class="w-44 h-44"
              alt="Player Stats"
          />
        </RouterLink>

        <RouterLink
            to="/playoffs"
            @click="isOpen = false"
            class="flex items-center gap-3"
        >
          <img
              :src="route.path.startsWith('/playoffs')
              ? '/logos/PLAYOFFS_2.svg'
              : '/logos/PLAYOFFS_1.svg'"
              class="w-44 h-44"
              alt="Playoffs"
          />
        </RouterLink>

        <RouterLink
            to="/news"
            @click="isOpen = false"
            class="flex items-center gap-3"
        >
          <img
              :src="route.path.startsWith('/news')
              ? '/logos/NEWS_2.svg'
              : '/logos/NEWS_1.svg'"
              class="w-44 h-44"
              alt="News"
          />
        </RouterLink>

        <AuthPanel />
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AuthPanel from '../Auth/AuthPanel.vue'
import { getTodayDateKey } from '../../composables/NBA/games/useGamesByDate'

const isOpen = ref(false)
const route = useRoute()
const gamesPath = computed(() => `/games/${getTodayDateKey()}`)
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.slide-enter-to,
.slide-leave-from {
  transform: translateX(0);
}
</style>
