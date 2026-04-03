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
            :input-class="'hidden'"
            :wrapper-class="'hidden'"
            :dropdown-class="'bg-white rounded-lg shadow-lg p-2 mt-1'"
        />
      </div>

      <div class="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
        <label class="flex items-center cursor-pointer">
          <div class="relative">
            <input type="checkbox" class="sr-only" v-model="hideScores" />
            <div
                class="block w-14 h-8 rounded-full transition-all"
                :class="hideScores ? 'bg-gray-300' : 'bg-blue-500'"
            ></div>
            <div
                class="dot absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow transition"
                :class="hideScores ? '' : 'translate-x-6'"
            ></div>
          </div>
          <span class="ml-2 text-gray-700">{{ hideScores ? 'Cчет скрыт' : '' }}</span>
        </label>

        <button
            @click="collapsed = !collapsed"
            class="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
        >
          {{ collapsed ? 'Развернуть' : 'Свернуть' }}
        </button>
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

      <div v-if="error" class="text-red-500 mb-2">{{ error }}</div>
      <div v-if="gamesList.length === 0 && !error" class="text-gray-500 mb-2">
        Нет игр за этот день
      </div>

      <ul class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <li
            v-for="game in gamesList"
            :key="game.id"
            class="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition"
        >
          <div class="flex justify-between items-center mb-2">
            <span class="text-gray-500 text-sm">{{ formatGameTime(game.datetime) }}</span>
            <span v-if="!hideScores" class="text-lg font-bold">
              {{ game.visitor_team_score }} - {{ game.home_team_score }}
            </span>
          </div>

          <div class="flex items-center justify-between mt-2">
            <div class="flex flex-col items-center">
              <img :src="getTeamLogo(game.visitor_team.abbreviation)" class="w-12 h-12 mb-1" />
              <span class="text-center font-medium text-sm">{{ getTeamFullName(game.visitor_team.abbreviation) }}</span>
            </div>
            <span class="text-gray-400 font-bold">vs</span>
            <div class="flex flex-col items-center">
              <img :src="getTeamLogo(game.home_team.abbreviation)" class="w-12 h-12 mb-1" />
              <span class="text-center font-medium text-sm">{{ getTeamFullName(game.home_team.abbreviation) }}</span>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Datepicker from 'vue3-datepicker'
import { useRecentGames } from '../../../composables/NBA/recent_games/useRecentGames'
import { getTeamLogo } from '../../../utils/getTeamLogo'
import { getTeamFullName } from '../../../utils/getTeamFullName'
import { datepickerRef, openCalendar, formatDateWithWeekday as formatDateHelper } from '../../../composables/NBA/recent_games/useGameHelpers'

const formatDateWithWeekday = (date: Date) => formatDateHelper(date)

const {
  gamesList,
  hideScores,
  formatGameTime,
  error,
  currentDate,
  prevDay,
  nextDay,
  collapsed,
  selectDate
} = useRecentGames()
</script>