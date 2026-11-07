<template>
  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <PlayInGameCard v-for="game in games" :key="game.id" :game="game" :hide-scores="hideScores" :label="`${game.conference === 'east' ? 'Восток' : 'Запад'} · ${labels[game.stage]}`" description="Один матч. Победитель продолжает борьбу за плей-офф." placeholder="Расписание пока не опубликовано" />
  </div>
</template>

<script setup lang="ts">
import type { PlayInGame } from '../../../types/playIn'
import PlayInGameCard from './PlayInGameCard.vue'
defineProps<{ games: PlayInGame[]; hideScores: boolean }>()
const labels = { seventh: '7-е против 8-го', elimination: '9-е против 10-го', eighth: 'За 8-й посев' }
</script>
