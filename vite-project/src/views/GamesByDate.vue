<template>
  <div class="min-h-screen bg-slate-50 px-4 pb-16 pt-28 sm:px-8 sm:pt-36">
    <Header />

    <main class="mx-auto flex max-w-7xl flex-col gap-6">
      <section class="flex flex-col gap-3">
        <p class="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">NBA games</p>
        <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-950 sm:text-4xl">
              {{ pageTitle }}
            </h1>
            <p class="mt-2 max-w-2xl text-sm text-gray-600">
              Время начала показано по Москве. День можно листать стрелками или выбрать в календарной ленте.
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label class="flex cursor-pointer items-center rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <input v-model="hideScoresModel" type="checkbox" class="sr-only" />

              <span
                  class="flex h-6 w-12 items-center rounded-full p-1 transition"
                  :class="hideScoresModel ? 'bg-gray-300' : 'bg-blue-500'"
              >
                <span
                    class="h-4 w-4 rounded-full bg-white shadow-md transition"
                    :class="hideScoresModel ? '' : 'translate-x-6'"
                ></span>
              </span>

              <span class="ml-2 text-sm font-semibold text-gray-700">
                {{ hideScoresModel ? 'Счёт скрыт' : 'Счёт виден' }}
              </span>
            </label>

            <div class="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm">
              {{ gamesCountLabel }}
            </div>
          </div>
        </div>
      </section>

      <GamesDatePicker
          :model-value="selectedDate"
          :counts="counts"
          @select="selectDate"
          @prev="goToPreviousDay"
          @next="goToNextDay"
          @today="goToToday"
          @visible-change="loadCounts"
      />

      <section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {{ error }}
        </div>

        <div
            v-else-if="isLoading"
            class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <div
              v-for="index in 6"
              :key="index"
              class="h-44 animate-pulse rounded-lg bg-gray-100"
          ></div>
        </div>

        <div
            v-else-if="!hasGames"
            class="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-center"
        >
          <div>
            <h2 class="text-xl font-bold text-gray-900">Игр за этот день нет</h2>
            <p class="mt-2 text-sm text-gray-500">Попробуй соседние дни в календаре выше.</p>
          </div>
        </div>

        <ul
            v-else
            class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <li
              v-for="game in games"
              :key="game.id"
              class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
          >
            <button
                type="button"
                class="flex h-full w-full flex-col gap-4 text-left"
                @click="goToGame(game.id)"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {{ game.statusTime || 'Время уточняется' }} МСК
                </span>
                <span class="text-xs font-semibold uppercase text-gray-500">{{ game.status }}</span>
              </div>

              <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div class="flex min-w-0 flex-col items-center gap-2">
                  <img :src="getTeamLogo(game.away.abbr)" :alt="game.away.name" class="h-14 w-14 object-contain" />
                  <span class="text-center text-sm font-semibold text-gray-900">{{ game.away.name }}</span>
                  <span v-if="game.away.score !== null" class="text-2xl font-bold text-gray-950">
                    {{ displayScore(game.away.score) }}
                  </span>
                </div>

                <span class="text-sm font-bold text-gray-400">vs</span>

                <div class="flex min-w-0 flex-col items-center gap-2">
                  <img :src="getTeamLogo(game.home.abbr)" :alt="game.home.name" class="h-14 w-14 object-contain" />
                  <span class="text-center text-sm font-semibold text-gray-900">{{ game.home.name }}</span>
                  <span v-if="game.home.score !== null" class="text-2xl font-bold text-gray-950">
                    {{ displayScore(game.home.score) }}
                  </span>
                </div>
              </div>
            </button>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import Header from '../components/Headers/Header.vue'
import GamesDatePicker from '../components/NBA/Games/GamesDatePicker.vue'
import { getTeamLogo } from '../utils/getTeamLogo'
import { useGamesByDatePage } from '../composables/NBA/games/useGamesByDatePage'

const {
  games,
  counts,
  hasGames,
  isLoading,
  error,
  selectedDate,
  hideScoresModel,
  pageTitle,
  gamesCountLabel,
  loadCounts,
  selectDate,
  goToPreviousDay,
  goToNextDay,
  goToToday,
  goToGame,
  displayScore
} = useGamesByDatePage()
</script>
