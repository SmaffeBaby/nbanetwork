<template>
  <article class="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ label }}</p>
    <RouterLink v-if="game && !hideScores" :to="gameLocation(game)" class="mt-3 block rounded-lg focus-visible:outline-2 focus-visible:outline-blue-600">
      <div v-for="side in ['away', 'home'] as const" :key="side" class="flex items-center gap-3 py-2">
        <img :src="`/logos/${game[side].abbr}.svg`" alt="" class="h-9 w-9 shrink-0 object-contain" />
        <span class="min-w-0 flex-1 text-sm font-bold text-slate-700">{{ game[side].name }}</span>
        <strong class="text-lg tabular-nums text-slate-900">{{ game[side].score ?? '—' }}</strong>
      </div>
      <p class="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">{{ date(game.date) }} МСК <span :class="game.status === 'Live' ? 'font-bold text-rose-600' : ''">· {{ game.status === 'Final' ? 'Завершён' : game.status === 'Live' ? 'В игре' : 'Скоро' }}</span> ↗</p>
    </RouterLink>
    <div v-else class="flex min-h-36 flex-col items-center justify-center gap-3 py-4 text-center">
      <span aria-hidden="true" class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-xl text-slate-300">?</span>
      <p class="text-xs leading-5 text-slate-400">{{ hideScores ? 'Участники и результаты скрыты' : placeholder }}</p>
      <RouterLink v-if="game" :to="gameLocation(game)" class="text-xs font-bold text-blue-600 hover:underline">Открыть матч ↗</RouterLink>
    </div>
    <p class="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-blue-700">{{ description }}</p>
  </article>
</template>

<script setup lang="ts">
import { gameLocation } from '../../../api/gameNavigation'
import type { PlayInGame } from '../../../types/playIn'
defineProps<{ game?: PlayInGame; label: string; description: string; placeholder: string; hideScores: boolean }>()
const date = (value: string) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
</script>
