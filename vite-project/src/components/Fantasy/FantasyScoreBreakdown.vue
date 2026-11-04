<template>
  <details v-for="game in score.games" :key="game.id" class="mt-3 rounded-xl border border-blue-100 bg-white p-3">
    <summary class="cursor-pointer text-sm font-bold text-slate-800">{{ game.matchup }} · {{ points(game.points) }} баллов <span class="block text-xs font-normal text-slate-500">{{ dateTime(game.start) }} МСК</span></summary>
    <div class="mt-3 divide-y divide-slate-100"><div v-for="item in game.breakdown" :key="item.key" class="flex items-center justify-between gap-3 py-2 text-xs"><span class="text-slate-600">{{ item.label }} <span class="text-slate-400">{{ item.count }} × {{ points(item.weight) }}</span></span><strong :class="item.points < 0 ? 'text-rose-600' : 'text-blue-700'">{{ item.points > 0 ? '+' : '' }}{{ points(item.points) }}</strong></div></div>
    <RouterLink :to="`/game/${game.id}`" class="mt-3 inline-block text-xs font-bold text-blue-700" @click="$emit('close')">Открыть матч ↗</RouterLink>
  </details>
  <div v-if="score.profile" class="mt-3 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-800">
    <p class="flex justify-between gap-3"><span>Базовые баллы</span><strong>{{ points(score.basePoints) }}</strong></p>
    <p class="mt-2 flex justify-between gap-3"><span>Бонус уровня {{ score.bonusLevel }} · +{{ points(score.bonusRate * 100) }}%</span><strong>+{{ points(score.bonusPoints) }}</strong></p>
  </div>
  <p v-if="!score.games.length" class="mt-3 text-sm text-slate-500">Начислений за этот турнир пока нет. Баллы появятся после обработки завершённых матчей.</p>
</template>

<script setup lang="ts">
import { dateTime, points, type FantasyScore } from './types'
defineProps<{ score: FantasyScore }>()
defineEmits<{ close: [] }>()
</script>
