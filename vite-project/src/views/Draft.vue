<template>
  <Header />
  <main class="mx-auto w-full min-w-0 max-w-7xl space-y-6 px-4 pb-16 pt-28 sm:px-8 sm:pt-36">
    <section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white sm:p-9">
      <SparklesIcon aria-hidden="true" class="pointer-events-none absolute -right-5 -top-3 h-56 w-56 rotate-12 text-blue-200/5" />
      <p class="text-xs font-bold uppercase tracking-[.2em] text-blue-300">Следующее поколение НБА</p>
      <div class="relative mt-3 flex flex-wrap items-end justify-between gap-5"><div><h1 class="text-3xl font-black sm:text-5xl">Драфт НБА <span class="text-blue-300">{{ year }}</span></h1><p class="mt-3 text-sm text-blue-100">От первого пика до последнего выбора</p></div><label class="text-xs font-bold text-blue-200">Год драфта<select v-model.number="year" aria-label="Год драфта" class="mt-2 block min-w-28 rounded-xl bg-white p-3 text-base text-slate-900"><option v-for="y in years" :key="y" :value="y">{{ y }}</option></select></label></div>
      <p class="relative mt-6 max-w-3xl border-t border-white/10 pt-4 text-xs leading-6 text-blue-100">Два раунда, новые имена и путь в лигу. Выберите год, чтобы посмотреть пики и команды, получившие права на игроков по данным драфта.</p>
    </section>
    <div role="tablist" aria-label="Раунды драфта" class="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2">
      <button v-for="r in [1, 2]" :id="`draft-round-${r}`" :key="r" :ref="el => { if (el) buttons[r] = el as HTMLButtonElement }" type="button" role="tab" :aria-selected="round === r" :tabindex="round === r ? 0 : -1" aria-controls="draft-content" class="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-blue-600" :class="round === r ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'" @click="round = r" @keydown.left.prevent="selectRound(round === 1 ? 2 : 1)" @keydown.right.prevent="selectRound(round === 1 ? 2 : 1)" @keydown.home.prevent="selectRound(1)" @keydown.end.prevent="selectRound(2)">{{ r === 1 ? 'Первый раунд' : 'Второй раунд' }}<span v-if="data" class="rounded-md bg-current/10 px-2 py-0.5 text-[10px]">{{ data.picks.filter(p => p.round === r).length }}</span></button>
    </div>
    <section id="draft-content" role="tabpanel" :aria-labelledby="`draft-round-${round}`" class="space-y-4">
      <p v-if="query.isPending.value" role="status" class="rounded-3xl bg-white p-10 text-center text-slate-500">Загружаем драфт {{ year }}…</p>
      <p v-if="query.error.value" role="alert" class="rounded-2xl bg-rose-50 p-5 text-sm text-rose-700">{{ query.error.value.message }} <button class="font-bold underline" @click="query.refetch()">Повторить</button></p>
      <template v-if="data">
        <div class="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500"><h2 class="font-bold text-slate-800">{{ round }}-й раунд · {{ picks.length }} пиков</h2><span>{{ data.completed ? 'Драфт завершён' : 'Выборы обновляются по мере публикации' }}</span></div>
        <DraftPicks v-if="picks.length" :picks="picks" :year="year" :round="round" />
        <p v-else class="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Выборы этого раунда пока не опубликованы.</p>
        <p class="px-1 text-xs leading-6 text-slate-400">Команда в таблице — получатель прав с учётом обменов, указанных ESPN, а не текущий клуб игрока. Номер пика общий для всего драфта. Количество выборов может отличаться от 60.</p>
        <p class="px-1 text-xs text-slate-400">Источник: <a :href="`https://www.espn.com/nba/draft/rounds/_/season/${year}`" target="_blank" rel="noopener noreferrer" class="underline">ESPN ↗</a> · обновлено {{ new Date(data.updatedAt).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' }) }} МСК.</p>
      </template>
    </section>
  </main>
</template>
<script setup lang="ts">
import { SparklesIcon } from '@heroicons/vue/24/solid'
import Header from '../components/Headers/Header.vue'
import DraftPicks from '../components/NBA/Draft/DraftPicks.vue'
import { useDraft } from '../composables/NBA/Draft/useDraft'
import { usePageTitle } from '../composables/usePageTitle'
const { year, years, round, query, picks } = useDraft()
const data = query.data
const buttons: Record<number, HTMLButtonElement> = {}
function selectRound(value: number) { round.value = value; buttons[value]?.focus() }
usePageTitle(() => `Драфт НБА ${year.value}`)
</script>
