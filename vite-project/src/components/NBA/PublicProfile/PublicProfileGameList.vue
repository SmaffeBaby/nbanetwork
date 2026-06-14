<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-black text-gray-900 sm:text-2xl">
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

    <div v-if="games.length" class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <Datepicker
          v-model="selectedDate"
          :available-dates="availableDates"
          :min-date="minDate"
          :max-date="maxDate"
          placeholder="Select date"
          @change="setSelectedDate"
      />

      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <DateSortControl
            :model-value="dateSortOrder"
            @update:model-value="setDateSortOrder"
        />

        <PublicProfileTeamFilter
            v-model="selectedTeam"
            :teams="teamOptions"
        />

        <button
            v-if="selectedDate || selectedTeam !== 'all'"
            type="button"
            class="w-full rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95 sm:w-auto"
            @click="resetFilters"
        >
          Сбросить
        </button>
      </div>
    </div>

    <div v-if="filteredGames.length" class="space-y-3">
      <div
          v-for="game in visibleGames"
          :key="game.id"
          class="relative rounded-2xl bg-white p-3 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg sm:p-4"
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

        <RouterLink :to="`/game/${game.id}`" class="block pr-7 sm:pr-8">
          <div class="mb-3 text-xs font-medium text-gray-500">
            {{ game.date || 'Дата матча' }}
          </div>

          <div class="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-center gap-2 sm:gap-3">
            <div class="flex min-w-0 items-center gap-2">
              <img
                  :src="getTeamLogo(game.awayAbbr)"
                  :alt="game.awayAbbr"
                  class="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
              >

              <div class="min-w-0">
                <div class="truncate text-xs font-semibold text-gray-900 sm:text-sm">
                  {{ game.awayName || game.awayAbbr }}
                </div>

                <div class="text-base font-black text-gray-900 sm:text-lg">
                  {{ score(game, 'away') }}
                </div>
              </div>
            </div>

            <div class="text-center text-xs font-bold text-gray-400">
              VS
            </div>

            <div class="flex min-w-0 items-center justify-end gap-2 text-right">
              <div class="min-w-0">
                <div class="truncate text-xs font-semibold text-gray-900 sm:text-sm">
                  {{ game.homeName || game.homeAbbr }}
                </div>

                <div class="text-base font-black text-gray-900 sm:text-lg">
                  {{ score(game, 'home') }}
                </div>
              </div>

              <img
                  :src="getTeamLogo(game.homeAbbr)"
                  :alt="game.homeAbbr"
                  class="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
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
          class="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          @click="previousPage"
      >
        Назад
      </button>

      <button
          type="button"
          :disabled="page === totalPages"
          class="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          @click="nextPage"
      >
        Дальше
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { watch, toRef } from 'vue'
import { RouterLink } from 'vue-router'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import type { FavoriteGame } from '../../../stores/auth'
import { getTeamLogo } from '../../../utils/getTeamLogo'
import Datepicker from '../../Datepicker/Datepicker.vue'
import DateSortControl from '../../Sort/DateSortControl.vue'
import PublicProfileTeamFilter from './PublicProfileTeamFilter.vue'
import { usePublicProfileGames } from '../../../composables/NBA/PublicProfile/usePublicProfileGames'

const props = defineProps<{
  title: string
  games: FavoriteGame[]
}>()

const {
  page,
  pageSize,
  selectedDate,
  selectedTeam,
  dateSortOrder,
  availableDates,
  minDate,
  maxDate,
  teamOptions,
  filteredGames,
  visibleGames,
  totalPages,
  isHidden,
  setSelectedDate,
  resetSelectedDate,
  setSelectedTeam,
  setDateSortOrder,
  toggleScore,
  score,
  previousPage,
  nextPage
} = usePublicProfileGames(toRef(props, 'games'))

watch(selectedTeam, setSelectedTeam)

const resetFilters = () => {
  resetSelectedDate()
  setSelectedTeam('all')
}
</script>
