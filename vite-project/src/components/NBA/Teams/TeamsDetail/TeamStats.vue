<template>
  <div class="space-y-6">
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
import { useTeamDetail } from '../../../../composables/NBA/Teams/TeamsDetail/useTeamDetail'
import { useSlider } from '../../../../composables/useSlider'
import { getTeamLogo } from '../../../../utils/getTeamLogo'
import StatLeaders from '../../player_stats/all_stats/StatLeaders.vue'
import PlayerTable from './TeamPlayerTable.vue'

const props = defineProps<{ teamAbbr: string }>()

const { players, loading, search, fetchPlayers } = useTeamDetail(props.teamAbbr)
onMounted(fetchPlayers)

const stats = [
  { title: 'Points Per Game', stat: 'PTS' },
  { title: 'Rebounds Per Game', stat: 'REB' },
  { title: 'Assists Per Game', stat: 'AST' },
  { title: 'Steals Per Game', stat: 'STL' },
  { title: 'Blocks Per Game', stat: 'BLK' },
] as const

const { currentSlide, nextIndex, next, prev, goTo, start, pause, onTouchStart, onTouchEnd } = useSlider(stats.length)
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