<template>
  <section v-if="user" class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-[10px] leading-15 font-bold break-words text-center pl-0 md:text-left md:pl-10 max-w-md">
        {{ title }}
      </h1>

      <RouterLink
          to="/player-stats"
          class="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
      >
        Все игроки
      </RouterLink>
    </div>

    <div
        v-if="favoritePlayers.length"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <button
          v-for="player in favoritePlayers"
          :key="player.id"
          type="button"
          class="group relative overflow-hidden rounded-2xl p-5 text-left text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
          :style="{ backgroundColor: player.bgColor }"
          @click="goToPlayer(player.name)"
      >
        <img
            v-if="player.bgSvg"
            :src="player.bgSvg"
            class="absolute inset-0 h-full w-full object-cover opacity-10 transition group-hover:opacity-20"
        />
        <div class="absolute inset-0 bg-gradient-to-br from-black/55 via-black/20 to-black/60"></div>
        <FavoritePlayerButton
            :player="player"
            class="absolute right-3 top-3 z-20"
        />

        <div class="relative z-10 flex items-center gap-4 pr-10">
          <img
              :src="getPlayerImage({ PLAYER_ID: player.id })"
              :data-player-id="player.id"
              :alt="player.name"
              class="h-20 w-20 rounded-2xl border border-white/20 bg-black/20 object-cover drop-shadow-2xl transition group-hover:scale-110"
              @error="handleImageError"
          />
          <div>
            <div class="text-sm font-semibold text-white/70">{{ player.teamAbbr || 'NBA' }}</div>
            <div class="text-xl font-black leading-tight">{{ player.name }}</div>
          </div>
        </div>
      </button>
    </div>

    <div
        v-else
        class="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center text-sm text-gray-500"
    >
      Любимые игроки появятся здесь после выбора в рейтингах или на странице игрока.
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../../../stores/auth'
import { teamStyles } from '../../../constants/TeamColorsAndBackground'
import { getPlayerImage, handleImageError } from '../../../utils/playerImage'
import FavoritePlayerButton from './FavoritePlayerButton.vue'

const auth = useAuthStore()
const { user } = storeToRefs(auth)
const router = useRouter()

const favoritePlayers = computed(() =>
    (user.value?.favoritePlayers ?? []).map(player => ({
      ...player,
      PLAYER_ID: player.id,
      PLAYER_NAME: player.name,
      TEAM_ABBREVIATION: player.teamAbbr,
      bgColor: teamStyles[player.teamAbbr]?.bgColorHex ?? '#111827',
      bgSvg: teamStyles[player.teamAbbr]?.bgSvg
    }))
)

const title = computed(() =>
    favoritePlayers.value.length === 1 ? 'Любимый игрок' : 'Любимые игроки'
)

const goToPlayer = (name: string) => {
  router.push(`/player/${encodeURIComponent(name)}`)
}
</script>
