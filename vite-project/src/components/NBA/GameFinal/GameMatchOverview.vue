<template>
  <section class="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm">
    <header class="space-y-3 p-5 sm:p-7">
      <div class="flex flex-wrap items-center justify-between gap-2"><p class="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Обзор матча</p><span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">{{ recap.meta?.status === 'Final' ? 'Матч завершён' : 'Матч идёт' }}</span></div>
      <h2 class="m-0 text-xl font-black leading-tight text-slate-900 sm:text-3xl">{{ recap.title }}</h2>
      <p class="text-xs leading-5 text-slate-500 sm:text-sm">{{ gameDate }}<span v-if="recap.venue"> · {{ recap.venue }}</span></p>
    </header>

    <div class="border-y border-slate-100 bg-slate-50/60 px-3 py-5 sm:px-7">
      <h3 class="mb-3 text-xs font-bold text-slate-600">Счёт по четвертям</h3>
      <div class="overflow-x-auto overscroll-x-contain rounded-2xl border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" role="region" aria-label="Счёт по четвертям, таблица с горизонтальной прокруткой" tabindex="0">
        <table class="w-full min-w-[340px] border-collapse text-center text-xs tabular-nums sm:text-sm">
          <caption class="sr-only">Счёт по периодам: {{ recap.meta?.awayTeam }} — {{ recap.meta?.homeTeam }}</caption>
          <thead class="bg-slate-50 text-[10px] font-bold text-slate-400"><tr><th scope="col" class="sticky left-0 z-10 bg-slate-50 px-3 py-3 text-left">Команда</th><th v-for="period in periods" :key="period.label" scope="col" class="px-2 py-3 sm:px-4">{{ period.label }}</th><th scope="col" class="bg-slate-100 px-3 py-3 text-slate-700">Итог</th></tr></thead>
          <tbody><tr v-for="side in sides" :key="side" class="border-t border-slate-100">
            <th scope="row" class="sticky left-0 z-10 bg-white px-3 py-3 text-left"><RouterLink :to="`/team/${recap.meta?.[`${side}Abbr`]}`" class="flex items-center gap-2 text-slate-800 hover:text-blue-600"><img :src="`/logos/${recap.meta?.[`${side}Abbr`]}.svg`" alt="" class="h-7 w-7 shrink-0 object-contain" /><span class="font-extrabold">{{ recap.meta?.[`${side}Abbr`] }}</span></RouterLink></th>
            <td v-for="period in periods" :key="period.label" class="px-2 py-3 font-bold sm:px-4" :class="period[side] !== null && period[side]! > (period[side === 'home' ? 'away' : 'home'] ?? Infinity) ? 'text-blue-700' : 'text-slate-500'">{{ period[side] ?? '—' }}</td>
            <td class="bg-blue-50/60 px-3 py-3 text-base font-black text-slate-900">{{ recap.meta?.[`${side}Score`] ?? '—' }}</td>
          </tr></tbody>
        </table>
      </div>
    </div>

    <div class="p-5 sm:p-7">
      <div v-if="recap.meta?.status !== 'Final'" class="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">Подробный разбор появится после завершения матча. Счёт по четвертям обновляется по ходу игры.</div>
      <div v-else-if="query.isPending.value" role="status" class="space-y-4"><p class="text-sm text-slate-500">Готовим подробный разбор матча…</p><div aria-hidden="true" class="space-y-3 motion-safe:animate-pulse"><div v-for="line in 5" :key="line" class="h-3 rounded-full bg-slate-100" :class="line % 2 ? 'w-full' : 'w-4/5'" /></div></div>
      <p v-else-if="query.isError.value" role="alert" class="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">Не удалось загрузить сохранённый разбор. <button type="button" class="font-bold underline" @click="query.refetch()">Повторить</button></p>
      <p v-else-if="!article" role="status" class="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">{{ query.data.value?.message || 'Ожидаем полный итоговый протокол для разбора матча.' }}</p>
      <article v-else class="mx-auto max-w-3xl">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Подробный разбор</p>
        <h2 class="mt-3 text-xl font-black leading-snug text-slate-900 sm:text-2xl">{{ article.title }}</h2>
        <p class="mt-4 border-l-4 border-blue-500 pl-4 text-[15px] font-medium leading-7 text-slate-700 sm:text-base">{{ article.deck }}</p>
        <nav class="my-6 flex flex-wrap gap-2" aria-label="Содержание разбора"><a v-for="(section, index) in article.sections" :key="section.id" :href="`#${articleId}-${section.id}`" class="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700">{{ index + 1 }}. {{ section.title }}</a></nav>
        <section v-for="section in article.sections" :id="`${articleId}-${section.id}`" :key="section.id" class="scroll-mt-28 border-t border-slate-100 py-6 first:border-0">
          <h3 class="mb-4 text-lg font-extrabold leading-6 text-slate-900 sm:text-xl">{{ section.title }}</h3>
          <div class="space-y-4 text-[15px] leading-7 text-slate-700 sm:text-base sm:leading-8"><p v-for="(paragraph, index) in section.paragraphs" :key="index">{{ paragraph }}</p></div>
        </section>
        <footer class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-[11px] text-slate-400"><span>Разбор по итоговому протоколу матча</span><a :href="article.source.url" target="_blank" rel="noopener noreferrer" class="font-semibold text-blue-600 hover:underline">Источник: {{ article.source.name }} ↗</a></footer>
      </article>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, useId } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import type { AnalysisArticle } from './analysisTypes'
const props = defineProps<{ recap: any }>()
const sides = ['away', 'home'] as const, articleId = useId()
const gameDate = computed(() => props.recap.dateUTC ? new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(props.recap.dateUTC)) + ' МСК' : '')
const periods = computed(() => {
  const raw: string[] = props.recap.meta?.quarters || props.recap.quarters || []
  return Array.from({ length: Math.max(4, raw.length) }, (_, i) => {
    const match = String(raw[i] || '').match(/^(?:[^:]+:\s*)?(\d+)\s*[-–]\s*(\d+)$/)
    return { label: i < 4 ? `Q${i + 1}` : `OT${i - 3}`, away: match ? Number(match[1]) : null, home: match ? Number(match[2]) : null }
  })
})
const query = useQuery({
  queryKey: computed(() => ['game-article', props.recap.gameId]), enabled: computed(() => props.recap.meta?.status === 'Final'),
  queryFn: async ({ queryKey: [, id], signal }): Promise<{ article: AnalysisArticle | null; createdAt?: string; message?: string }> => {
    const response = await fetch(`/api/game-article/${encodeURIComponent(String(id))}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]) })
    if (!response.ok) throw new Error('Разбор временно недоступен')
    return response.json()
  }, staleTime: Infinity, retry: 1, refetchInterval: query => query.state.data?.article === null ? 30000 : false
})
const article = computed(() => query.data.value?.article)
</script>
