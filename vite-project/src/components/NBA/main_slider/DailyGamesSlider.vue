<template>
  <div class="relative">
    <Swiper
        v-if="isMobile"
        :modules="[Navigation]"
        direction="vertical"
        :slides-per-view="3"
        :space-between="16"
        grab-cursor
        @reachEnd="atEnd = true"
        @fromEdge="atEnd = false"
        class="py-4 h-[calc(100vh-150px)] overflow-visible"
    >
      <SwiperSlide
          v-for="game in gamesList"
          :key="game.id"
          class="relative"
      >
        <div class="match-card w-full p-4 bg-white rounded-xl transform scale-100 transition-transform duration-300">
          <MatchCardContent :game="game" :countdowns="countdowns" :formatGameTime="formatGameTime" />
        </div>
      </SwiperSlide>
    </Swiper>

    <Swiper
        v-else
        :modules="[Navigation]"
        :slides-per-view="3"
        :space-between="16"
        navigation
        grab-cursor
        class="py-4"
    >
      <SwiperSlide
          v-for="game in gamesList"
          :key="game.id"
      >
        <div class="match-card w-full p-4 bg-white rounded-lg shadow-md">
          <MatchCardContent :game="game" :countdowns="countdowns" :formatGameTime="formatGameTime" />
        </div>
      </SwiperSlide>
    </Swiper>

    <div class="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white to-transparent"></div>
    <div class="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent"></div>

    <div
        v-if="isMobile && !atEnd"
        class="absolute bottom-4 left-1/2 -translate-x-1/2 text-gray-500 text-sm animate-bounce z-10"
    >
      ⬆️ ещё игры
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'

import type { Game } from '../../../composables/NBA/main_slider/useDailyGames.ts'
import { useCountdowns } from '../../../composables/NBA/main_slider/useCountdowns.ts'
import MatchCardContent from './MatchCardContent.vue'

const props = defineProps<{
  gamesList: Game[]
  formatGameTime: (iso: string) => string
}>()

const { countdowns } = useCountdowns(props.gamesList)

const isMobile = ref(false)
const atEnd = ref(false)

const checkScreen = () => {
  isMobile.value = window.innerWidth < 640
}

onMounted(() => {
  checkScreen()
  window.addEventListener('resize', checkScreen)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreen)
})
</script>

<style scoped>

.swiper-slide {

  overflow: visible !important;
}

.match-card {

  transition: transform 0.3s ease;
}
</style>