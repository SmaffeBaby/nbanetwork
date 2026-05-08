<template>
  <div class="flex flex-wrap items-center justify-center gap-2">
    <button
        type="button"
        :disabled="!game || pendingWatched"
        class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        :class="isWatched ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
        @click.stop="toggleWatched"
    >
      <CheckCircleSolidIcon v-if="isWatched" class="h-4 w-4" />
      <CheckCircleOutlineIcon v-else class="h-4 w-4" />
      Смотрел
    </button>

    <button
        type="button"
        :disabled="!game || pendingFavorite"
        class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        :class="isFavorite ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
        @click.stop="toggleFavorite"
    >
      <StarSolidIcon v-if="isFavorite" class="h-4 w-4" />
      <StarOutlineIcon v-else class="h-4 w-4" />
      Избранное
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { CheckCircleIcon as CheckCircleOutlineIcon, StarIcon as StarOutlineIcon } from '@heroicons/vue/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/vue/24/solid'
import { useToast } from 'vue-toastification'
import { useAuthStore, type FavoriteGame } from '../../../stores/auth'

const props = defineProps<{
  game: any
}>()

const auth = useAuthStore()
const { user } = storeToRefs(auth)
const toast = useToast()
const pendingWatched = ref(false)
const pendingFavorite = ref(false)

const gameSnapshot = computed<FavoriteGame | null>(() => {
  if (!props.game?.gameId) return null

  return {
    id: String(props.game.gameId),
    date: props.game.dateMSK ?? props.game.dateUTC ?? null,
    homeName: props.game.home?.name ?? '',
    homeAbbr: props.game.home?.abbr ?? '',
    homeScore: props.game.home?.score ?? null,
    awayName: props.game.away?.name ?? '',
    awayAbbr: props.game.away?.abbr ?? '',
    awayScore: props.game.away?.score ?? null
  }
})

const isWatched = computed(() =>
    Boolean(gameSnapshot.value && user.value?.watchedGames.some(game => game.id === gameSnapshot.value?.id))
)
const isFavorite = computed(() =>
    Boolean(gameSnapshot.value && user.value?.favoriteGames.some(game => game.id === gameSnapshot.value?.id))
)

const ensureUser = () => {
  if (user.value) return true
  toast.info('Войдите, чтобы отмечать матчи')
  return false
}

const toggleWatched = async () => {
  if (!ensureUser() || !gameSnapshot.value) return

  pendingWatched.value = true
  await auth.toggleWatchedGame(gameSnapshot.value)
  pendingWatched.value = false
}

const toggleFavorite = async () => {
  if (!ensureUser() || !gameSnapshot.value) return

  pendingFavorite.value = true
  await auth.toggleFavoriteGame(gameSnapshot.value)
  pendingFavorite.value = false
}
</script>
