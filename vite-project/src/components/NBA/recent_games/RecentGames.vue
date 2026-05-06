<template>
  <div>
    <h1 class="text-[10px] leading-15 font-bold break-words text-center pl-0 md:text-left md:pl-10 max-w-md">
      Прошедшие игры
    </h1>
  </div>

  <div class="bg-gray-50 p-6 rounded-xl shadow-lg">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
      <div class="flex flex-col gap-2">
        <h2
            class="text-2xl font-bold flex items-center gap-2 cursor-pointer"
            @click="openCalendar"
        >
          Игры за - {{ formatDateWithWeekday(currentDate) }}
        </h2>

        <Datepicker
            ref="datepickerRef"
            v-model="currentDate"
            :value-type="'date'"
            :format="formatDateWithWeekday"
            @change="selectDate"
            class="hidden"
        />
      </div>


    </div>

    <div v-if="!collapsed">

      <div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2 sm:gap-4">
        <button
            @click="prevDay"
            class="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
        >
          ← Предыдущий день
        </button>
        <button
            @click="nextDay"
            class="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
        >
          Следующий день →
        </button>
      </div>

      <div v-if="error" class="text-red-500">
        {{ error }}
      </div>

      <div
          v-if="isLoading"
          role="status"
          class="flex items-center justify-center py-10"
      >
        <svg
            aria-hidden="true"
            class="inline w-10 h-10 text-gray-200 animate-spin fill-blue-600"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2167 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
        </svg>
        <span class="sr-only">Загрузка матчей...</span>
      </div>

      <div v-if="gamesList.length === 0 && !error && !isLoading">
        Нет игр за этот день
      </div>

      <ul v-if="!isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        <li
            v-for="game in gamesList"
            :key="getGameId(game)"
            class="bg-white p-4 rounded-xl shadow hover:shadow-lg transition cursor-pointer"
            @click="goToGame(game)"
        >

          <div class="flex justify-between">
            <span class="text-gray-500">
              {{ game.statusTime }} по МСК
            </span>


          </div>

          <div class="flex justify-between items-center mt-3">

            <div class="flex flex-col items-center">
              <img :src="getTeamLogo(game.away.abbr)" class="w-10 h-10 mb-1" />
              <div class="text-sm text-center">{{ game.away.name }}</div>
            </div>

            <div class="text-gray-400 font-bold">vs</div>

            <div class="flex flex-col items-center">
              <img :src="getTeamLogo(game.home.abbr)" class="w-10 h-10 mb-1" />
              <div class="text-sm text-center">{{ game.home.name }}</div>
            </div>

          </div>

        </li>

      </ul>

    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import Datepicker from 'vue3-datepicker'

import { useRecentGames } from '../../../composables/NBA/recent_games/useRecentGames'
import { getTeamLogo } from '../../../utils/getTeamLogo'
import {
  openCalendar,
  formatDateWithWeekday,
  datepickerRef
} from '../../../composables/NBA/recent_games/useGameHelpers'

const router = useRouter()

const {
  gamesList,
  error,
  isLoading,
  currentDate,
  prevDay,
  nextDay,
  collapsed,
  selectDate
} = useRecentGames()

const getGameId = (g: any) =>
    g?.Game_ID ?? g?.GAME_ID ?? ''

const goToGame = (game: any) => {
  const id = getGameId(game)
  if (!id) return
  router.push(`/game/${id}`)
}
</script>