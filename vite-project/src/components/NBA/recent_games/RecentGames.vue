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

      <div v-if="gamesList.length === 0 && !error">
        Нет игр за этот день
      </div>

      <ul class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

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