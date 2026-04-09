<template>
  <div class="p-6 space-y-6">

    <div class="flex justify-center mb-4">
      <img :src="getTeamLogo(teamAbbr)" class="w-32 h-32" />
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

    <div
        class="relative mb-6"
        @mouseenter="pause"
        @mouseleave="start"
        @touchstart="onTouchStart"
        @touchend="onTouchEnd"
    >

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

        <Transition name="fade" mode="out-in">
          <div :key="currentSlide">
            <StatLeaders
                :title="stats[currentSlide].title"
                :stat="stats[currentSlide].stat"
                :players="players"
            />
          </div>
        </Transition>

        <Transition name="fade" mode="out-in">
          <div :key="nextIndex">
            <StatLeaders
                :title="stats[nextIndex].title"
                :stat="stats[nextIndex].stat"
                :players="players"
            />
          </div>
        </Transition>

      </div>

      <button
          @click="prev"
          class="absolute top-1/2 left-0 -translate-y-1/2 bg-white/70 hover:bg-white px-3 py-2 rounded-r-xl shadow"
      >
        ‹
      </button>

      <button
          @click="next"
          class="absolute top-1/2 right-0 -translate-y-1/2 bg-white/70 hover:bg-white px-3 py-2 rounded-l-xl shadow"
      >
        ›
      </button>

      <div class="flex justify-center mt-3 gap-2">
        <span
            v-for="(_, i) in stats"
            :key="i"
            @click="goTo(i)"
            class="w-2.5 h-2.5 rounded-full cursor-pointer"
            :class="i === currentSlide ? 'bg-blue-500' : 'bg-gray-300'"
        />
      </div>

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
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'

import { useTeamDetail } from '../../../../composables/NBA/Teams/TeamsDetail/useTeamDetail'
import { useSlider } from '../../../../composables/useSlider'

import { getTeamLogo } from '../../../../utils/getTeamLogo'
import StatLeaders from '../../player_stats/all_stats/StatLeaders.vue'
import PlayerTable from './TeamPlayerTable.vue'

const route = useRoute()
const teamAbbr = route.params.abbr as string

const { players, loading, search, fetchPlayers } = useTeamDetail(teamAbbr)
onMounted(fetchPlayers)


const stats = [
  { title: 'Points Per Game', stat: 'PTS' },
  { title: 'Rebounds Per Game', stat: 'REB' },
  { title: 'Assists Per Game', stat: 'AST' },
  { title: 'Steals Per Game', stat: 'STL' },
  { title: 'Blocks Per Game', stat: 'BLK' },
] as const


const {
  currentSlide,
  nextIndex,
  next,
  prev,
  goTo,
  start,
  pause,
  onTouchStart,
  onTouchEnd,
} = useSlider(stats.length)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>