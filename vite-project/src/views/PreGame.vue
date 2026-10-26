<template>
 <div class="min-h-screen bg-gray-50 px-3 pb-14 pt-24 sm:px-6 lg:px-8 lg:pt-28">
  <Header />
  <main class="mx-auto max-w-7xl pt-6 sm:pt-10">
   <div class="mb-6 flex items-center justify-between gap-3"><button class="rounded-xl bg-white px-4 py-2 text-sm font-bold shadow-sm" type="button" @click="goBack">← Назад</button></div>
   <div v-if="loading" class="rounded-3xl bg-white p-12 text-center text-gray-500">Загружаем предматчевые данные…</div>
   <div v-if="error" role="alert" class="mb-5 rounded-2xl bg-red-50 p-4 text-red-600">{{ error.message }} <button class="ml-2 underline" @click="retry()">Повторить</button></div>
   <p v-if="preview && preview.state!=='pre'" class="py-12 text-center text-gray-500">Матч уже начался. Открываем игру…</p>
   <template v-if="preview && preview.state==='pre'">
    <h1 class="mb-6 text-center text-2xl font-black text-gray-900 sm:text-3xl">{{ bySide.away.name }} — {{ bySide.home.name }}</h1>
    <div class="grid items-stretch gap-5 lg:grid-cols-[1fr_270px_1fr]">
     <PreGameLineup :team="bySide.away" class="order-2 lg:order-1" />
     <section class="order-1 flex flex-col items-center justify-center rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-6 text-center lg:order-2">
      <span class="mb-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-600 shadow-sm">{{ preview.season }}</span>
      <p class="text-sm font-semibold text-gray-500">{{ /POSTPON|CANCEL/.test(preview.statusName)?'Матч перенесён или отменён':remaining>0?'До начала матча':'Ожидаем начала матча' }}</p>
      <div class="my-4 font-mono text-4xl font-black tracking-tight text-gray-900" role="timer" aria-label="До начала матча">{{ countdown }}</div>
      <p class="text-sm font-bold text-gray-700">{{ preview.dateMSK }} МСК</p><p class="mt-2 text-xs text-gray-400">{{ preview.venue }}</p>
     </section>
     <PreGameLineup :team="bySide.home" class="order-3" />
    </div>
    <div class="mt-6"><GamePrediction :game-id="preview.gameId" :teams="bySide" /></div>
    <section class="mt-8">
     <h2 class="mb-4 text-2xl font-black text-gray-900">Травмы и участие в матче</h2>
     <div class="grid gap-5 md:grid-cols-2">
      <article v-for="team in preview.teams" :key="team.id" class="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
       <h3 class="mb-4 font-black text-gray-900">{{ team.name }}</h3>
       <p v-if="!team.injuries.length" class="text-sm text-gray-500">В отчёте ESPN нет игроков с ограничениями.</p>
       <template v-for="group in injuryGroups" :key="group.key">
        <template v-if="team.injuries.some((i:any)=>i.availability===group.key)">
         <h4 class="mb-2 mt-4 text-xs font-bold uppercase tracking-wide" :class="group.key==='out'?'text-red-500':'text-amber-600'">{{ group.label }}</h4>
         <div v-for="player in team.injuries.filter((i:any)=>i.availability===group.key)" :key="player.id" class="flex items-center gap-3 border-t border-gray-50 py-3">
          <img :src="player.image" alt="" class="h-11 w-11 rounded-full bg-gray-50 object-cover" @error="hideImage"><div><RouterLink :to="`/player/${encodeURIComponent(player.name)}`" class="text-sm font-bold text-gray-800 hover:text-blue-600">{{ player.name }}</RouterLink><p class="text-xs text-gray-500">{{ statusLabel(player.status) }}<span v-if="player.detail"> · {{ player.detail }}</span></p></div>
         </div>
        </template>
       </template>
      </article>
     </div>
    </section>
    <section class="mt-8 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
     <h2 class="text-2xl font-black text-gray-900">Команды в сезоне {{ preview.season }}</h2><p class="mt-1 text-sm text-gray-500">{{ preview.seasonType===3?'Плей-офф':preview.seasonType===1?'Предсезонные игры':'Регулярный сезон' }} · средние показатели за матч</p>
     <div class="mt-6 grid grid-cols-[1fr_1.3fr_1fr] gap-2 border-b pb-3 text-center text-xs font-bold text-gray-500"><span>{{ bySide.away.abbr }} · игр: {{ bySide.away.statistics.gamesPlayed ?? '—' }}</span><span>Показатель</span><span>{{ bySide.home.abbr }} · игр: {{ bySide.home.statistics.gamesPlayed ?? '—' }}</span></div>
     <div v-for="(label,key) in statLabels" :key="key" class="grid grid-cols-[1fr_1.3fr_1fr] gap-2 border-b border-gray-50 py-3 text-center text-sm"><strong class="text-gray-900">{{ statValue(teamValue('away',key)) }}</strong><span class="text-gray-500">{{ label }}</span><strong class="text-gray-900">{{ statValue(teamValue('home',key)) }}</strong></div>
    </section>
    <section class="mt-8">
     <h2 class="mb-4 text-2xl font-black text-gray-900">Лидеры команд</h2>
     <div class="grid gap-5 lg:grid-cols-2">
      <article v-for="team in preview.teams" :key="team.id" class="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
       <h3 class="mb-5 font-black text-gray-900">{{ team.name }}</h3>
       <div v-for="category in team.leaders" :key="category.key" class="mb-5 last:mb-0"><h4 class="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{{ statLabels[category.key] }} за матч</h4><p v-if="!category.players.length" class="text-sm text-gray-400">Показатели пока недоступны.</p>
        <RouterLink v-for="player in category.players" :key="player.id" :to="`/player/${encodeURIComponent(player.name)}`" class="flex items-center gap-3 rounded-xl py-2 hover:bg-gray-50"><img :src="player.image" alt="" class="h-9 w-9 rounded-full bg-gray-50 object-cover" @error="hideImage"><span class="min-w-0 flex-1 text-sm font-semibold text-gray-800">{{ player.name }}</span><strong class="text-base text-gray-900">{{ statValue(player.value) }}</strong></RouterLink>
       </div>
      </article>
     </div>
    </section>
    <p class="mt-6 text-center text-xs text-gray-400">Данные ESPN · обновлено {{ updatedLabel }}<span v-if="preview.teams.some((t:any)=>t.unavailable.length)"> · Часть данных временно недоступна.</span></p>
   </template>
  </main>
 </div>
</template>
<script setup lang="ts">
import { useBackNavigation } from '../composables/useBackNavigation'

import {computed} from 'vue'
import {usePageTitle} from '../composables/usePageTitle'
import {useRoute} from 'vue-router'
import Header from '../components/Headers/Header.vue'
import PreGameLineup from '../components/NBA/GameFinal/PreGameLineup.vue'
import GamePrediction from '../components/NBA/GameFinal/GamePrediction.vue'
import {useGamePreview} from '../composables/NBA/GameFinal/useGamePreview'
import {statLabels,statValue,statusLabel} from '../composables/NBA/GameFinal/previewLabels'

const { goBack } = useBackNavigation('/games')
const route=useRoute()
const {preview,loading,error,countdown,remaining,retry}=useGamePreview(computed(()=>String(route.params.gameId)))
const bySide=computed(()=>Object.fromEntries((preview.value?.teams || []).map((team:any)=>[team.side,team])))
usePageTitle(()=>bySide.value.away && bySide.value.home ? `${bySide.value.away.name} — ${bySide.value.home.name} — Перед матчем` : null)
const updatedLabel=computed(()=>preview.value?.updatedAt?new Date(preview.value.updatedAt).toLocaleTimeString('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'})+' МСК':'—')
const teamValue=(side:string,key:string)=>bySide.value[side]?.statistics.values.find((s:any)=>s.key===key)?.value ?? null
const injuryGroups=[{key:'out',label:'Не сыграют / маловероятное участие'},{key:'uncertain',label:'Под вопросом / решение перед матчем'}]
const hideImage=(event:Event)=>{(event.target as HTMLImageElement).style.display='none'}
</script>
