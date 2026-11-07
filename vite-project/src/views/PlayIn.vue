<template>
  <Header />
  <main class="mx-auto w-full min-w-0 max-w-7xl space-y-6 px-4 pb-16 pt-28 sm:px-8 sm:pt-36">
    <section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white sm:p-9">
      <BoltIcon aria-hidden="true" class="pointer-events-none absolute -right-5 -top-3 h-56 w-56 rotate-12 text-blue-200/5" />
      <p class="text-xs font-bold uppercase tracking-[.2em] text-blue-300">8 команд · 4 путёвки в плей-офф</p>
      <div class="relative mt-3 flex flex-wrap items-end justify-between gap-5">
        <div><h1 class="text-3xl font-black sm:text-5xl">Плей-инн</h1><p class="mt-3 text-sm text-blue-100">Последний шаг к плей-офф · сезон {{ year - 1 }}–{{ String(year).slice(-2) }}</p></div>
        <label class="text-xs font-bold text-blue-200">Розыгрыш<select v-model.number="year" aria-label="Год плей-ин" class="mt-2 block min-w-28 rounded-xl bg-white p-3 text-base text-slate-900"><option v-for="y in years" :key="y" :value="y">{{ y - 1 }}–{{ String(y).slice(-2) }}</option></select></label>
      </div>
      <p class="relative mt-6 max-w-3xl border-t border-white/10 pt-4 text-xs leading-6 text-blue-100">Команды с 7-го по 10-е место в каждой конференции разыгрывают два оставшихся места в плей-офф. Каждая встреча решается в одном матче.</p>
    </section>

    <div role="tablist" aria-label="Разделы плей-ин" class="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2">
      <button v-for="tab in tabs" :id="`play-in-${tab.id}`" :key="tab.id" :ref="el => { if (el) tabButtons[tab.id] = el as HTMLButtonElement }" type="button" role="tab" :aria-selected="stage === tab.id" :tabindex="stage === tab.id ? 0 : -1" aria-controls="play-in-content" class="flex-1 rounded-xl px-3 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-blue-600" :class="stage === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'" @click="stage = tab.id" @keydown.left.prevent="selectTab(stage === 'bracket' ? 'games' : 'bracket')" @keydown.right.prevent="selectTab(stage === 'bracket' ? 'games' : 'bracket')" @keydown.home.prevent="selectTab('bracket')" @keydown.end.prevent="selectTab('games')">{{ tab.label }}</button>
    </div>

    <section id="play-in-content" role="tabpanel" :aria-labelledby="`play-in-${stage}`" class="space-y-6">
      <p v-if="query.isPending.value" role="status" class="rounded-3xl bg-white p-10 text-center text-slate-500">Загружаем матчи плей-ин…</p>
      <p v-if="query.error.value" role="alert" class="rounded-2xl bg-rose-50 p-5 text-sm text-rose-700">{{ query.error.value.message }} <button class="font-bold underline" @click="query.refetch()">Повторить</button></p>
      <template v-if="data">
        <p v-if="!data.complete" class="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Часть расписания недоступна. Показаны полученные матчи. <button class="font-bold underline" @click="query.refetch()">Обновить</button></p>
        <p v-if="hideScores" class="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800">Включено скрытие счёта. Участники и результаты скрыты, чтобы не раскрывать исходы предыдущих матчей.</p>
        <p v-if="!data.games.length" class="rounded-2xl bg-white p-6 text-sm text-slate-500">{{ data.complete ? 'Расписание этого розыгрыша пока не опубликовано.' : 'Пока не удалось получить матчи этого розыгрыша.' }}</p>
        <PlayInBracket v-if="stage === 'bracket'" :games="data.games" :hide-scores="hideScores" />
        <PlayInGames v-else :games="data.games" :hide-scores="hideScores" />
        <p class="text-xs leading-5 text-slate-400">Расписание и результаты: ESPN · обновлено {{ new Date(data.updatedAt).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' }) }} МСК.</p>
      </template>
    </section>
    <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm">
      <a href="https://www.nba.com/news/nba-play-in-tournament" target="_blank" rel="noopener noreferrer" class="font-bold text-slate-500 hover:text-blue-600">Как устроен плей-ин ↗</a>
      <RouterLink to="/playoffs" class="font-bold text-blue-600 hover:underline">К сетке плей-офф →</RouterLink>
    </div>
  </main>
</template>

<script setup lang="ts">
import { BoltIcon } from '@heroicons/vue/24/solid'
import Header from '../components/Headers/Header.vue'
import PlayInBracket from '../components/NBA/PlayIn/PlayInBracket.vue'
import PlayInGames from '../components/NBA/PlayIn/PlayInGames.vue'
import { usePlayIn } from '../composables/NBA/PlayIn/usePlayIn'
import { usePageTitle } from '../composables/usePageTitle'
const { year, years, stage, query, hideScores } = usePlayIn()
const data = query.data
const tabs = [{ id: 'bracket', label: 'Сетка плей-ин' }, { id: 'games', label: 'Все матчи' }]
const tabButtons: Record<string, HTMLButtonElement> = {}
function selectTab(id: string) { stage.value = id; tabButtons[id]?.focus() }
usePageTitle(() => `Плей-инн НБА ${year.value}`)
</script>
