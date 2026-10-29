<template>
  <section class="min-w-0" :aria-labelledby="titleId">
    <header class="mb-4 flex items-start justify-between gap-3"><div class="min-w-0"><h2 :id="titleId" class="m-0 text-lg font-extrabold leading-6 text-slate-900 sm:text-2xl">{{ title }}</h2><p v-if="subtitle" class="mt-1 text-xs leading-5 text-slate-500">{{ subtitle }}</p></div><div v-if="games.length > 1" class="flex shrink-0 gap-2"><button type="button" :aria-label="`Предыдущие матчи: ${title}`" class="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 transition hover:border-blue-300 disabled:opacity-30" :disabled="atStart" @click="move(-1)">‹</button><button type="button" :aria-label="`Следующие матчи: ${title}`" class="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 transition hover:border-blue-300 disabled:opacity-30" :disabled="atEnd" @click="move(1)">›</button></div></header>
    <slot />
    <p v-if="error" role="alert" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{{ error }} <button type="button" class="font-bold underline" @click="$emit('retry')">Повторить</button></p>
    <p v-else-if="!games.length" class="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">{{ emptyText }}</p>
    <div v-else ref="track" class="matches-track grid grid-flow-col gap-4 overflow-x-auto overscroll-x-contain pb-3 snap-x snap-mandatory" @scroll.passive="update">
      <RouterLink v-for="game in games" :key="game.id" :to="gameLocation(game)" class="min-w-0 snap-start rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
        <div class="mb-4 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wide"><span :class="/final/i.test(game.status) ? 'text-slate-400' : 'text-blue-600'">{{ /final/i.test(game.status) ? 'Завершён' : game.period > 0 ? 'В игре' : /cancel|postpon/i.test(game.status) ? 'Перенесён / отменён' : 'Скоро' }}</span><span aria-hidden="true" class="text-slate-300">↗</span></div>
        <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div class="min-w-0 text-center"><img :src="`/logos/${game.visitor_team.abbreviation}.svg`" :alt="game.visitor_team.full_name" class="mx-auto h-12 w-12 object-contain" loading="lazy" /><p class="mt-2 text-xs font-black text-slate-700">{{ game.visitor_team.abbreviation }}</p></div>
          <span v-if="game.home_team_score !== null && game.visitor_team_score !== null && (/final/i.test(game.status) || game.period > 0)" class="whitespace-nowrap text-lg font-black tabular-nums text-slate-900">{{ hideScores ? '—' : game.visitor_team_score }} : {{ hideScores ? '—' : game.home_team_score }}</span><span v-else class="text-xs font-black text-slate-300">VS</span>
          <div class="min-w-0 text-center"><img :src="`/logos/${game.home_team.abbreviation}.svg`" :alt="game.home_team.full_name" class="mx-auto h-12 w-12 object-contain" loading="lazy" /><p class="mt-2 text-xs font-black text-slate-700">{{ game.home_team.abbreviation }}</p></div>
        </div>
        <p class="mt-4 border-t border-slate-100 pt-3 text-center text-[11px] font-medium text-slate-500">{{ date(game.datetime) }} МСК</p>
      </RouterLink>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { gameLocation } from '../../../api/gameNavigation'
import { useAuthStore } from '../../../stores/auth'
import type { RelatedMatch } from './analysisTypes'
const props = defineProps<{ title: string; subtitle?: string; games: RelatedMatch[]; emptyText: string; error?: string }>()
defineEmits<{ retry: [] }>()
const auth = useAuthStore()
const hideScores = computed(() => auth.loading || auth.user?.hideScores !== false)
const titleId = useId(), track = ref<HTMLElement | null>(null), atStart = ref(true), atEnd = ref(false)
const date = (value: string) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
function update() { const el = track.value; atStart.value = !el || el.scrollLeft < 2; atEnd.value = !el || el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 }
function move(direction: number) { const el = track.value; if (el) el.scrollBy({ left: direction * (el.firstElementChild?.getBoundingClientRect().width || el.clientWidth) + direction * 16, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }) }
let observer: ResizeObserver | undefined
function observe() { observer?.disconnect(); if (track.value) { observer = new ResizeObserver(update); observer.observe(track.value) }; update() }
watch(() => props.games, async () => { await nextTick(); if (track.value) track.value.scrollLeft = 0; observe() })
onMounted(observe)
onUnmounted(() => observer?.disconnect())
</script>
<style scoped>
.matches-track { grid-auto-columns: 86%; scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
@media (min-width: 640px) { .matches-track { grid-auto-columns: calc((100% - 16px) / 2); } }
@media (min-width: 1024px) { .matches-track { grid-auto-columns: calc((100% - 32px) / 3); } }
</style>
