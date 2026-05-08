<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-black text-gray-900">
          {{ title }}
        </h2>

        <p v-if="games.length" class="mt-1 text-sm font-medium text-gray-500">
          {{ filteredGames.length }} из {{ games.length }} матчей
        </p>
      </div>

      <span v-if="filteredGames.length" class="text-sm font-medium text-gray-500">
        {{ page }}/{{ totalPages }}
      </span>
    </div>

    <div v-if="games.length" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Datepicker
          v-model="selectedDate"
          :available-dates="availableDates"
          :min-date="minDate"
          :max-date="maxDate"
          placeholder="Select date"
          @change="setSelectedDate"
      />

      <button
          v-if="selectedDate"
          type="button"
          class="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
          @click="resetSelectedDate"
      >
        Сбросить дату
      </button>
    </div>

    <div v-if="filteredGames.length" class="space-y-3">
      <div
          v-for="game in visibleGames"
          :key="game.id"
          class="relative rounded-2xl bg-white p-4 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <button
            type="button"
            :title="isHidden(game.id) ? 'Показать счёт' : 'Скрыть счёт'"
            class="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 active:scale-95"
            @click.prevent.stop="toggleScore(game.id)"
        >
          <EyeSlashIcon v-if="isHidden(game.id)" class="h-4 w-4" />
          <EyeIcon v-else class="h-4 w-4" />
        </button>

        <RouterLink :to="`/game/${game.id}`" class="block pr-8">
          <div class="mb-3 text-xs font-medium text-gray-500">
            {{ game.date || 'Дата матча' }}
          </div>

          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2">
              <img
                  :src="getTeamLogo(game.awayAbbr)"
                  :alt="game.awayAbbr"
                  class="h-9 w-9 object-contain"
              >

              <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-gray-900">
                  {{ game.awayName || game.awayAbbr }}
                </div>

                <div class="text-lg font-black text-gray-900">
                  {{ score(game, 'away') }}
                </div>
              </div>
            </div>

            <div class="text-xs font-bold text-gray-400">
              VS
            </div>

            <div class="flex min-w-0 items-center justify-end gap-2 text-right">
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-gray-900">
                  {{ game.homeName || game.homeAbbr }}
                </div>

                <div class="text-lg font-black text-gray-900">
                  {{ score(game, 'home') }}
                </div>
              </div>

              <img
                  :src="getTeamLogo(game.homeAbbr)"
                  :alt="game.homeAbbr"
                  class="h-9 w-9 object-contain"
              >
            </div>
          </div>
        </RouterLink>
      </div>
    </div>

    <div
        v-else
        class="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center text-sm text-gray-500"
    >
      {{ selectedDate ? 'На выбранную дату матчей нет.' : 'Пока пусто.' }}
    </div>

    <div v-if="filteredGames.length > pageSize" class="flex items-center justify-between gap-3">
      <button
          type="button"
          :disabled="page === 1"
          class="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          @click="previousPage"
      >
        Назад
      </button>

      <button
          type="button"
          :disabled="page === totalPages"
          class="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          @click="nextPage"
      >
        Дальше
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { RouterLink } from 'vue-router'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import type { FavoriteGame } from '../../../stores/auth'
import { getTeamLogo } from '../../../utils/getTeamLogo'
import Datepicker from '../../Datepicker/Datepicker.vue'
import { usePublicProfileGames } from '../../../composables/NBA/PublicProfile/usePublicProfileGames'

const props = defineProps<{
  title: string
  games: FavoriteGame[]
}>()

const {
  page,
  pageSize,
  selectedDate,
  availableDates,
  minDate,
  maxDate,
  filteredGames,
  visibleGames,
  totalPages,
  isHidden,
  setSelectedDate,
  resetSelectedDate,
  toggleScore,
  score,
  previousPage,
  nextPage
} = usePublicProfileGames(toRef(props, 'games'))
</script>