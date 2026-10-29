<template>
  <div class="rounded-xl bg-indigo-50 p-3">
    <p class="flex flex-wrap justify-between gap-1 text-xs font-bold text-indigo-800"><span>Уровень {{ level.level }}</span><span>{{ points(level.totalXp) }} XP</span></p>
    <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-indigo-100" role="progressbar" aria-label="Уровень игрока" :aria-valuenow="Math.round(level.percent)" :aria-valuemin="0" :aria-valuemax="100"><div class="h-full rounded-full bg-indigo-500" :style="{ width: `${level.percent}%` }" /></div>
    <p class="mt-2 text-[10px] font-bold text-indigo-700">Бонус для нового состава: +{{ points(playerBonusRate(level.level)) }}%</p>
    <p class="mt-1 text-[10px] text-indigo-600">До уровня {{ level.level + 1 }}: {{ points(level.remainingXp) }} XP</p>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { experienceLevel } from '../../utils/experience'
import { playerBonusRate } from './progress'
import { points } from './types'
const props = defineProps<{ xp: number }>()
const level = computed(() => experienceLevel(props.xp))
</script>
