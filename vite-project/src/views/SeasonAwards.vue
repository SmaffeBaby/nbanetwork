<template>
  <Header />
  <main class="mx-auto w-full min-w-0 max-w-7xl space-y-6 px-4 pb-16 pt-28 sm:px-8 sm:pt-36">
    <section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white sm:p-9">
      <TrophyIcon aria-hidden="true" class="pointer-events-none absolute -right-5 -top-3 h-56 w-56 rotate-12 text-amber-200/5" />
      <p class="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Лучшие в своём деле</p>
      <div class="relative mt-3 flex flex-wrap items-end justify-between gap-5"><div><h1 class="text-3xl font-black sm:text-5xl">Награды сезона</h1><p class="mt-3 text-sm text-blue-100">Игроки, тренеры, сборные и чемпионы · {{ season }}</p></div><label class="text-xs font-bold text-amber-200">Сезон<select v-model="season" aria-label="Сезон наград" class="mt-2 block min-w-32 rounded-xl bg-white p-3 text-base text-slate-900"><option v-for="s in seasons" :key="s" :value="s">{{ s }}</option></select></label></div>
      <p class="relative mt-6 max-w-3xl border-t border-white/10 pt-4 text-xs leading-6 text-blue-100">От признания по итогам недели до MVP финала. Победители появляются по мере объявления наград; архив позволяет вернуться к прошлым сезонам.</p>
    </section>
    <div class="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2" role="group" aria-label="Этап чемпионата"><button v-for="item in stages" :key="item.id" type="button" :aria-pressed="stage===item.id" class="flex-1 rounded-xl px-3 py-3 text-sm font-bold" :class="stage===item.id?'bg-blue-600 text-white shadow-sm':'text-slate-500 hover:bg-slate-50'" @click="selectStage(item.id)">{{ item.label }}</button></div>
    <div role="tablist" aria-label="Виды наград" class="flex flex-wrap gap-2">
      <button v-for="tab in tabs" :id="`awards-${tab.id}`" :key="tab.id" :ref="el=>{if(el)buttons[tab.id]=el as HTMLButtonElement}" role="tab" type="button" :aria-selected="category===tab.id" :tabindex="category===tab.id?0:-1" aria-controls="awards-content" class="rounded-xl border px-4 py-2.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-blue-600" :class="category===tab.id?'border-slate-900 bg-slate-900 text-white':'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-600'" @click="category=tab.id" @keydown.right.prevent="moveTab(1)" @keydown.left.prevent="moveTab(-1)" @keydown.home.prevent="selectTab(tabs[0]!.id)" @keydown.end.prevent="selectTab(tabs[tabs.length-1]!.id)">{{ tab.label }}</button>
    </div>
    <section id="awards-content" role="tabpanel" :aria-labelledby="`awards-${category}`" class="space-y-4">
      <div class="flex items-center justify-between gap-4 px-1"><h2 class="text-xl font-black text-slate-900">{{ selected.label }}</h2><span v-if="data" class="text-xs text-slate-400">{{ data.rows.length }} записей</span></div>
      <p v-if="query.isPending.value" role="status" class="rounded-3xl bg-white p-10 text-center text-sm text-slate-500">Загружаем награды {{ season }}…</p>
      <p v-if="query.error.value" role="alert" class="rounded-2xl bg-rose-50 p-5 text-sm text-rose-700">{{ query.error.value.message }} <button class="font-bold underline" @click="query.refetch()">Повторить</button></p>
      <template v-if="data">
        <p v-if="!data.complete" class="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Часть архива недоступна. Показаны полученные данные. <button class="font-bold underline" @click="query.refetch()">Обновить</button></p>
        <SeasonAwardsTable v-if="data.rows.length" :rows="data.rows" :category="category" :season="season" :title="selected.label" />
        <p v-else class="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm leading-6 text-slate-500">Для этого сезона в архиве пока нет записей. Награда могла ещё не быть объявлена или не вручалась в выбранном сезоне.</p>
        <p v-if="category==='week'" class="px-1 text-xs text-slate-400">В таблице указана дата объявления награды. Недели без награждения пропущены.</p>
        <details class="rounded-2xl bg-white px-5 py-4 text-xs text-slate-400"><summary class="cursor-pointer font-bold text-slate-500">Источники и обновление</summary><ul class="mt-3 space-y-2"><li v-for="source in data.sources" :key="source.url"><a :href="source.url" target="_blank" rel="noopener noreferrer" class="underline">{{ source.name }} ↗</a></li></ul><p class="mt-3">Обновлено {{ new Date(data.updatedAt).toLocaleString('ru-RU',{timeZone:'Europe/Moscow',dateStyle:'short',timeStyle:'short'}) }} МСК.</p></details>
      </template>
    </section>
  </main>
</template>
<script setup lang="ts">
import {TrophyIcon} from '@heroicons/vue/24/solid'
import Header from '../components/Headers/Header.vue'
import SeasonAwardsTable from '../components/NBA/Awards/SeasonAwardsTable.vue'
import {useSeasonAwards} from '../composables/NBA/Awards/useSeasonAwards'
import {usePageTitle} from '../composables/usePageTitle'
const {season,seasons,category,stage,tabs,selected,query,selectStage}=useSeasonAwards()
const data=query.data,buttons:Record<string,HTMLButtonElement>={}
const stages=[{id:'regular',label:'Регулярный чемпионат'},{id:'playoffs',label:'Плей-офф'}]
function selectTab(id:string){category.value=id;buttons[id]?.focus()}
function moveTab(delta:number){const index=tabs.value.findIndex(tab=>tab.id===category.value);selectTab(tabs.value[(index+delta+tabs.value.length)%tabs.value.length]!.id)}
usePageTitle(()=>`Награды сезона НБА ${season.value}`)
</script>
