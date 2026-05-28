<template>
  <div class="space-y-4">

    <div v-if="loading" class="text-center text-gray-400 animate-pulse text-sm">
      Loading game...
    </div>

    <div v-else-if="error" class="text-center text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm">
      {{ error }}
    </div>

    <div
        v-else
        class="relative rounded-2xl bg-white p-4 shadow-md transition active:scale-[0.98] sm:p-5"
    >

      <div class="mb-3 flex items-center justify-between text-xs text-gray-500">

        <div class="flex items-center gap-2 uppercase tracking-wide">

          <span>{{ game?.status }}</span>

          <span
              v-if="isLive"
              class="flex items-center gap-1 text-red-500 font-semibold"
          >
            <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            LIVE
          </span>

        </div>

        <button
            @click="toggleScore"
            class="p-2 rounded-full active:scale-90 transition"
        >
          <EyeIcon v-if="isVisible" class="w-5 h-5 text-gray-600" />
          <EyeSlashIcon v-else class="w-5 h-5 text-gray-400" />
        </button>

      </div>

      <div class="grid grid-cols-[minmax(0,1fr)_minmax(104px,auto)_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(160px,auto)_minmax(0,1fr)] sm:gap-4">

        <div class="flex min-w-0 flex-col items-center">
          <div class="relative">
            <img
                :src="getTeamLogo(game?.away?.abbr)"
                class="h-14 w-14 cursor-pointer object-contain transition-all duration-300 ease-out hover:scale-125 hover:rotate-3 hover:drop-shadow-xl active:scale-110 sm:h-12 sm:w-12"
                @click="goTeam(game?.away?.abbr)"
            />
          </div>
          <div class="mt-2 max-w-[92px] text-center text-xs font-medium leading-tight text-gray-700 sm:max-w-40 sm:text-sm">
            {{ game?.away?.name }}
          </div>
        </div>

        <div class="min-w-0 text-center">
          <transition name="fade-scale" mode="out-in">
            <div
                :key="gameId + (isVisible ? '-visible' : '-hidden')"
                class="text-2xl font-bold leading-none text-gray-700 sm:text-3xl"
            >
              <template v-if="isVisible && game?.home?.score != null">
                {{ game.away.score }}
                <span class="mx-1 text-gray-400">:</span>
                {{ game.home.score }}
              </template>

              <template v-else>
                VS
              </template>
            </div>
          </transition>

          <div class="mt-3 flex min-w-0 items-center justify-center gap-1.5">

            <div class="min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-center text-[11px] font-medium leading-5 text-gray-600 sm:px-3">
              {{ game?.dateMSK }}
            </div>

            <button
                @click="copyGameLink"
                title="Скопировать ссылку"
                class="p-1.5 rounded-md hover:bg-gray-100 active:scale-90 transition"
            >
              <LinkIcon class="w-4 h-4 text-gray-500" />
            </button>

          </div>

          <GameUserActions
              :game="game"
              class="mx-auto mt-3 max-w-[160px] sm:max-w-none"
          />
        </div>

        <div class="flex min-w-0 flex-col items-center">
          <div class="relative">
            <img
                :src="getTeamLogo(game?.home?.abbr)"
                class="h-14 w-14 cursor-pointer object-contain transition-all duration-300 ease-out hover:scale-125 hover:rotate-3 hover:drop-shadow-xl active:scale-110 sm:h-12 sm:w-12"
                @click="goTeam(game?.home?.abbr)"
            />
          </div>
          <div class="mt-2 max-w-[92px] text-center text-xs font-medium leading-tight text-gray-700 sm:max-w-40 sm:text-sm">
            {{ game?.home?.name }}
          </div>
        </div>

      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import { toRef, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getTeamLogo } from '../../../utils/getTeamLogo'
import { EyeIcon, EyeSlashIcon, LinkIcon } from '@heroicons/vue/24/outline'
import { useGameHeader } from '../../../composables/NBA/GameFinal/useGameHeader'
import { useToast } from 'vue-toastification'
import GameUserActions from '../Favorites/GameUserActions.vue'

const toast = useToast()
const route = useRoute()

const props = defineProps<{
  game: any
  loading: boolean
  error: string | null
}>()

const {
  isVisible,
  isLive,
  toggleScore,
  goTeam
} = useGameHeader(toRef(props, 'game'))

const gameId = computed(() => {
  const raw = route.params.gameId
  return Array.isArray(raw) ? raw[0] : String(raw)
})

const gameUrl = computed(() =>
    `${window.location.origin}/game/${gameId.value}`
)

const copyGameLink = async () => {
  try {
    await navigator.clipboard.writeText(gameUrl.value)
    toast.success('Матч скопирован')
  } catch (e) {
    toast.error('Ошибка копирования')
  }
}
</script>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.25s ease;
}

.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.fade-scale-leave-to {
  opacity: 0;
  transform: scale(1.1);
}
</style>
