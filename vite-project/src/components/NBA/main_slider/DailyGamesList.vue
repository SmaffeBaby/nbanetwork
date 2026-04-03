<template>
  <div>
    <h1 class="text-[10px] leading-15 font-bold break-words text-center pl-0 md:text-left md:pl-10 max-w-md">Матчи сегодня</h1>


    <p v-if="gamesList.length === 0 && !error" class="text-gray-500">
      Сегодня игр нет
    </p>

    <DailyGamesSlider
        v-else
        :gamesList="gamesList"
        :formatGameTime="formatGameTime"
    />

<!--    <div class="mb-4">-->
<!--      <label for="timezone" class="mr-2 font-medium">Выберите часовой пояс:</label>-->
<!--      <select id="timezone" v-model="selectedTimezone" class="border rounded px-2 py-1">-->
<!--        <option value="Europe/Moscow">МСК</option>-->
<!--        <option value="America/New_York">New York</option>-->
<!--        <option value="America/Los_Angeles">Los Angeles</option>-->
<!--      </select>-->
<!--    </div>-->

    <div v-if="error" class="text-red-500 mt-4">{{ error }}</div>
  </div>
</template>

<script lang="ts" setup>
import { useDailyGames } from '../../../composables/NBA/main_slider/useDailyGames.ts'
import DailyGamesSlider from './DailyGamesSlider.vue'

const { gamesList, selectedTimezone, error, formatGameTime } = useDailyGames()
</script>