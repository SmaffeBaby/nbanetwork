<template>
  <div>
    <h1 class="text-[10px] leading-15 font-bold break-words text-center pl-0 md:text-left md:pl-10 max-w-md">Ближайшие матчи</h1>


    <p v-if="loading" class="text-gray-500 dark:text-slate-400">Загрузка игр…</p>
    <p v-else-if="gamesList.length === 0 && !error" class="text-gray-500 dark:text-slate-400">
      В расписании пока нет ближайших матчей.
    </p>

    <DailyGamesSlider
        v-else-if="gamesList.length"
        :gamesList="gamesList"
        :formatGameTime="formatGameTime"
    />

    <div v-if="error" class="text-red-500 mt-4">{{ error }} <button type="button" class="ml-2 underline" @click="retry">Повторить</button></div>
  </div>
</template>

<script lang="ts" setup>
import { useDailyGames } from '../../../composables/NBA/main_slider/useDailyGames.ts'
import DailyGamesSlider from './DailyGamesSlider.vue'

const { gamesList, error, loading, retry, formatGameTime } = useDailyGames()
</script>