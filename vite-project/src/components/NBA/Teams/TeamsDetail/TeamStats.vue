<template>
  <div class="space-y-6">
    <div
        v-if="!loading"
        class="relative mb-6"
        @mouseenter="pause"
        @mouseleave="start"
        @touchstart="onTouchStart"
        @touchend="onTouchEnd"
    >
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                class="hidden md:block"
            />
          </div>
        </Transition>
      </div>

      <button
          @click="prev"
          class="absolute top-1/2 left-0 -translate-y-1/2 bg-white/70 hover:bg-white px-3 py-2 rounded-r-xl shadow md:-left-3"
      >
        ‹
      </button>

      <button
          @click="next"
          class="absolute top-1/2 right-0 -translate-y-1/2 bg-white/70 hover:bg-white px-3 py-2 rounded-l-xl shadow md:-right-3"
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
        class="mb-4 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm"
    />

    <div v-if="loading" class="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">Loading...</div>

    <PlayerTable
        v-else
        :players="players"
        :search="search"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, toRef } from 'vue'
import { useTeamDetail } from '../../../../composables/NBA/Teams/TeamsDetail/useTeamDetail'
import { useSlider } from '../../../../composables/useSlider'
import StatLeaders from '../../player_stats/all_stats/StatLeaders.vue'
import PlayerTable from './TeamPlayerTable.vue'

const props = defineProps<{
  teamAbbr: string
  season: string
  seasonType: 'regular' | 'playoffs'
}>()

const seasonRef = toRef(props, 'season')
const seasonTypeRef = toRef(props, 'seasonType')

const { players, loading, search, fetchPlayers } =
    useTeamDetail(props.teamAbbr, seasonRef, seasonTypeRef)

onMounted(fetchPlayers)

watch([seasonRef, seasonTypeRef], fetchPlayers)

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
  onTouchEnd
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