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
        class="relative p-4 rounded-2xl bg-white shadow-md flex flex-col gap-3 active:scale-[0.98] transition"
    >

      <div class="flex justify-between items-center text-xs text-gray-500">

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

      <div class="flex items-center justify-between">

        <div class="flex flex-col items-center w-1/3">
          <div class="relative">
            <img
                :src="getTeamLogo(game?.away?.abbr)"
                class="w-12 h-12 cursor-pointer transition-all duration-300 ease-out hover:scale-125 hover:rotate-3 hover:drop-shadow-xl active:scale-110"
                @click="goTeam(game?.away?.abbr)"
            />
            <FavoriteTeamButton
                v-if="game?.away?.abbr"
                :teamAbbr="game.away.abbr"
                size="sm"
                class="absolute -right-4 -top-3"
            />
          </div>
          <div class="text-xs mt-1 text-center font-medium">
            {{ game?.away?.name }}
          </div>
        </div>

        <div class="text-center">
          <transition name="fade-scale" mode="out-in">
            <div
                :key="gameId + (isVisible ? '-visible' : '-hidden')"
                class="text-2xl sm:text-3xl font-bold"
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

          <div class="mt-2 flex justify-center items-center gap-2">

            <div class="px-3 py-1 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-600 font-medium">
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
        </div>

        <div class="flex flex-col items-center w-1/3">
          <div class="relative">
            <img
                :src="getTeamLogo(game?.home?.abbr)"
                class="w-12 h-12 cursor-pointer transition-all duration-300 ease-out hover:scale-125 hover:rotate-3 hover:drop-shadow-xl active:scale-110"
                @click="goTeam(game?.home?.abbr)"
            />
            <FavoriteTeamButton
                v-if="game?.home?.abbr"
                :teamAbbr="game.home.abbr"
                size="sm"
                class="absolute -right-4 -top-3"
            />
          </div>
          <div class="text-xs mt-1 text-center font-medium">
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
import FavoriteTeamButton from '../Favorites/FavoriteTeamButton.vue'

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