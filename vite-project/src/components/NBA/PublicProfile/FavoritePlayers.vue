<template>
  <section class="space-y-4">
    <h2 class="text-2xl font-black text-gray-900">Любимые игроки</h2>

    <div
        v-if="favoritePlayers.length"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <button
          v-for="player in favoritePlayers"
          :key="player.id"
          type="button"
          class="group relative overflow-hidden rounded-2xl p-5 text-left text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
          :style="{ backgroundColor: player.bgColor }"
          @click="emit('select', player.name)"
      >
        <img
            v-if="player.bgSvg"
            :src="player.bgSvg"
            :alt="`${player.name} background`"
            class="absolute inset-0 h-full w-full object-cover opacity-10 transition group-hover:opacity-20"
        >

        <div class="absolute inset-0 bg-gradient-to-br from-black/55 via-black/20 to-black/60" />

        <div class="relative z-10 flex items-center gap-4">
          <img
              :src="getPlayerImage({ PLAYER_ID: player.id })"
              :data-player-id="player.id"
              :alt="player.name"
              class="h-20 w-20 rounded-2xl border border-white/20 bg-black/20 object-cover drop-shadow-2xl transition group-hover:scale-110"
              @error="handleImageError"
          >

          <div>
            <div class="text-sm font-semibold text-white/70">
              {{ player.teamAbbr || 'NBA' }}
            </div>
            <div class="text-xl font-black leading-tight">
              {{ player.name }}
            </div>
          </div>
        </div>
      </button>
    </div>

    <div
        v-else
        class="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center text-sm text-gray-500"
    >
      Пользователь пока не выбрал любимых игроков.
    </div>
  </section>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import type { FavoritePlayer } from '../../../stores/auth'
import { useFavoritePlayers } from '../../../composables/NBA/PublicProfile/useFavoritePlayers'
import { getPlayerImage, handleImageError } from '../../../utils/playerImage'

const props = defineProps<{
  players: FavoritePlayer[] | null | undefined
}>()

const emit = defineEmits<{
  select: [name: string]
}>()

const { favoritePlayers } = useFavoritePlayers(toRef(props, 'players'))
</script>