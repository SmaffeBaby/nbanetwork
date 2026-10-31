<template>
  <Header />
  <main class="mx-auto w-full min-w-0 max-w-7xl space-y-6 px-4 pb-16 pt-28 sm:px-8 sm:pt-36">
    <section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white sm:p-9">
      <TrophyIcon aria-hidden="true" class="pointer-events-none absolute -right-5 -top-3 h-56 w-56 rotate-12 text-amber-200/5"/>
      <p class="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Один кубок · 30 команд</p>
      <div class="relative mt-3 flex flex-wrap items-end justify-between gap-5"><div><h1 class="text-3xl font-black sm:text-5xl">Emirates NBA Cup</h1><p class="mt-3 text-sm text-blue-100">Группы, матчи и путь к трофею · {{ year }}</p></div><label class="text-xs font-bold text-amber-200">Розыгрыш<select v-model.number="year" aria-label="Год NBA Cup" class="mt-2 block min-w-28 rounded-xl bg-white p-3 text-base text-slate-900"><option v-for="y in years" :key="y" :value="y">{{ y }}</option></select></label></div>
      <p class="relative mt-6 max-w-3xl border-t border-white/10 pt-4 text-xs leading-6 text-blue-100">Групповая стадия, четвертьфиналы и полуфиналы также входят в регулярный чемпионат. Финал определяет обладателя кубка и не идёт в зачёт регулярного сезона.</p>
    </section>
    <div role="tablist" aria-label="Стадии NBA Cup" class="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2"><button v-for="tab in tabs" :id="`cup-${tab.id}`" :key="tab.id" role="tab" :aria-selected="stage===tab.id" :tabindex="stage===tab.id?0:-1" aria-controls="cup-content" class="flex-1 rounded-xl px-3 py-3 text-sm font-bold" :class="stage===tab.id?'bg-blue-600 text-white shadow-sm':'text-slate-500 hover:bg-slate-50'" @click="stage=tab.id" @keydown.left.prevent="stage='groups'" @keydown.right.prevent="stage='bracket'">{{ tab.label }}</button></div>
    <section id="cup-content" role="tabpanel" :aria-labelledby="`cup-${stage}`" class="space-y-6">
      <p v-if="query.isPending.value" role="status" class="rounded-3xl bg-white p-10 text-center text-slate-500">Загружаем розыгрыш NBA Cup…</p>
      <p v-if="query.error.value" role="alert" class="rounded-2xl bg-rose-50 p-5 text-sm text-rose-700">{{ query.error.value.message }} <button class="font-bold underline" @click="query.refetch()">Повторить</button></p>
      <template v-if="data">
        <p v-if="!data.complete" class="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Часть расписания недоступна или ещё не опубликована. Таблицы предварительные. <button class="font-bold underline" @click="query.refetch()">Обновить</button></p>
        <p v-if="hideScores" class="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800">В аккаунте включено скрытие счёта. Результаты, места в группах и участники сетки скрыты, чтобы не раскрывать исходы.</p>
        <template v-if="stage==='groups'">
          <div v-for="conf in conferences" :key="conf.id" class="space-y-4"><h2 class="text-xl font-black text-slate-900">{{ conf.label }}</h2><div class="grid gap-4 lg:grid-cols-3">
            <article v-for="group in data.groups.filter(g=>g.conference===conf.id)" :key="group.id" class="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div class="flex items-center justify-between border-b border-slate-100 p-5"><h3 class="font-black text-slate-900">{{ group.label }}</h3><span class="text-xs text-slate-400">{{ group.games.length }} / 10 игр</span></div>
              <table class="w-full text-left text-xs"><thead class="bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th class="py-3 pl-3">#</th><th>Команда</th><th class="text-center" title="Сыграно">И</th><th class="text-center" title="Победы">В</th><th class="text-center" title="Поражения">П</th><th class="pr-3 text-right" title="Разница очков для тай-брейка">+/−</th></tr></thead><tbody><tr v-for="team in tableRows(group)" :key="team.abbr" class="border-t border-slate-100"><td class="py-3 pl-3 font-bold text-slate-400">{{ hideScores?'—':team.place??'—' }}</td><td><RouterLink :to="`/team/${team.abbr}`" :title="team.name" class="flex items-center gap-2 font-bold text-slate-700 hover:text-blue-600"><img :src="`/logos/${team.abbr}.svg`" alt="" class="h-7 w-7 object-contain"/>{{ team.abbr }}</RouterLink></td><td class="text-center text-slate-500">{{ team.played }}</td><td class="text-center font-bold text-slate-800">{{ hideScores?'—':team.wins }}</td><td class="text-center text-slate-500">{{ hideScores?'—':team.losses }}</td><td class="pr-3 text-right font-bold text-slate-700">{{ hideScores||!team.statsComplete?'—':team.diff>0?'+'+team.diff:team.diff }}</td></tr></tbody></table>
              <details class="border-t border-slate-100"><summary class="cursor-pointer p-4 text-xs font-bold text-blue-600">Матчи группы <span class="text-slate-400">↓</span></summary><div class="space-y-2 px-3 pb-3"><RouterLink v-for="game in group.games" :key="game.id" :to="gameLocation(game)" class="block rounded-xl bg-slate-50 p-3 text-xs hover:bg-blue-50"><div class="flex items-center justify-between gap-2 font-bold text-slate-700"><span>{{ game.away.abbr }} — {{ game.home.abbr }}</span><span>{{ score(game) }}</span></div><p class="mt-1 text-[10px] text-slate-400">{{ date(game.date) }} МСК</p></RouterLink></div></details>
            </article>
          </div></div>
          <div class="rounded-2xl bg-white p-5 text-xs leading-6 text-slate-500"><p>В плей-офф выходят победители шести групп и по одной команде wild card от каждой конференции. Каждый клуб проводит четыре групповые игры.</p><p class="mt-2">Таблицы рассчитываются по завершённым кубковым матчам: доля побед, личные встречи, разница очков, набранные очки, результат прошлого регулярного сезона. Неразрешённые равенства делят место; это не объявление официального выхода в плей-офф. {{ year>=2024?'Овертаймы исключены из разницы и суммы очков.':'В розыгрыше 2023 года очки овертаймов учитывались.' }}</p></div>
        </template>
        <template v-else>
          <p class="text-sm text-slate-500">Один матч на каждой стадии. Будущие пары появляются после публикации расписания.</p>
          <div class="grid items-stretch gap-5 lg:grid-cols-3">
            <section v-for="round in rounds" :key="round.id" class="min-w-0 rounded-3xl border border-slate-200 bg-slate-100/70 p-4"><h2 class="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><TrophyIcon v-if="round.id==='final'" class="h-5 w-5 text-amber-500"/>{{ round.label }}</h2><div class="flex h-[calc(100%-3rem)] flex-col justify-around gap-4">
              <article v-for="slot in roundSlots(round)" :key="slot.key" class="relative rounded-2xl border bg-white p-4 shadow-sm" :class="round.id==='final'?'border-amber-200':'border-slate-200'">
                <p class="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ slot.label }}</p>
                <RouterLink v-if="slot.game&&!hideScores" :to="gameLocation(slot.game)" class="block"><div v-for="side in ['away','home'] as const" :key="side" class="flex items-center gap-3 py-2"><img :src="`/logos/${slot.game[side].abbr}.svg`" alt="" class="h-9 w-9 object-contain"/><span class="min-w-0 flex-1 text-sm font-bold text-slate-700">{{ slot.game[side].name }}</span><strong class="text-lg text-slate-900">{{ slot.game[side].score??'—' }}</strong></div><p class="mt-3 border-t border-slate-100 pt-3 text-[10px] text-slate-400">{{ date(slot.game.date) }} МСК · {{ slot.game.status==='Final'?'Завершён':slot.game.status==='Live'?'В игре':'Скоро' }} ↗</p></RouterLink>
                <div v-else class="flex min-h-28 flex-col items-center justify-center gap-3 text-center"><span class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-xl text-slate-300">?</span><p class="text-xs text-slate-400">{{ hideScores?'Участники скрыты':'Участники пока не определены' }}</p><RouterLink v-if="slot.game" :to="gameLocation(slot.game)" class="text-xs font-bold text-blue-600">Открыть матч ↗</RouterLink></div>
              </article>
            </div></section>
          </div>
        </template>
        <p class="text-xs leading-5 text-slate-400">Результаты и расписание: ESPN · <a :href="data.drawSource" target="_blank" rel="noopener noreferrer" class="underline">Жеребьёвка NBA</a> · обновлено {{ new Date(data.updatedAt).toLocaleTimeString('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'}) }} МСК.</p>
      </template>
    </section>
  </main>
</template>
<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {useQuery} from '@tanstack/vue-query'
import {TrophyIcon} from '@heroicons/vue/24/solid'
import Header from '../components/Headers/Header.vue'
import {useAuthStore} from '../stores/auth'
import {usePageTitle} from '../composables/usePageTitle'
import {gameLocation} from '../api/gameNavigation'
import type {GameCompetition} from '../types/gameCompetition'
type Team={abbr:string;name:string;score:number|null}
type CupGame={id:string;date:string;status:string;completed:boolean;competition:GameCompetition;home:Team;away:Team}
type Row={abbr:string;name:string;played:number;wins:number;losses:number;points:number;diff:number;place:number|null;statsComplete:boolean}
type Group={id:string;conference:string;label:string;teams:Row[];games:CupGame[]}
type Cup={year:number;complete:boolean;groups:Group[];games:CupGame[];drawSource:string;updatedAt:string}
const route=useRoute(),router=useRouter(),auth=useAuthStore(),years=[2026,2025,2024,2023],requested=Number(route.query.year)
const year=ref(years.includes(requested)?requested:years[0]!),stage=ref(route.query.stage==='bracket'?'bracket':'groups')
const tabs=[{id:'groups',label:'Групповая стадия'},{id:'bracket',label:'Сетка плей-офф'}],conferences=[{id:'east',label:'Восточная конференция'},{id:'west',label:'Западная конференция'}],rounds=[{id:'quarterfinal',label:'Четвертьфиналы',count:4},{id:'semifinal',label:'Полуфиналы',count:2},{id:'final',label:'Финал',count:1}]
const query=useQuery({queryKey:computed(()=>['nba-cup',year.value]),queryFn:async({signal,queryKey})=>{const r=await fetch(`/api/nba-cup/${queryKey[1]}`,{signal:AbortSignal.any([signal,AbortSignal.timeout(75000)])});const d=await r.json();if(!r.ok)throw new Error(d.error||'Не удалось загрузить кубок');return d as Cup},staleTime:60000,retry:1,refetchInterval:60000})
const data=query.data,hideScores=computed(()=>auth.loading||auth.user?.hideScores!==false)
const tableRows=(g:Group)=>hideScores.value?[...g.teams].sort((a,b)=>a.abbr.localeCompare(b.abbr)):g.teams
const score=(g:CupGame)=>!g.completed?'VS':hideScores.value?'— : —':`${g.away.score} : ${g.home.score}`
const date=(d:string)=>new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(d))
function roundSlots(round:typeof rounds[number]){
 const games=data.value?.games.filter(g=>g.competition.stage===round.id)||[]
 if(round.id==='final')return [{key:'final',label:'За кубок',game:games[0]}]
 return conferences.flatMap(conf=>{const members=data.value?.groups.filter(g=>g.conference===conf.id).flatMap(g=>g.teams.map(t=>t.abbr))||[];const fixtures=games.filter(g=>members.includes(g.home.abbr)&&members.includes(g.away.abbr));return Array.from({length:round.count/2},(_,i)=>({key:`${conf.id}-${i}`,label:`${conf.id==='east'?'Восток':'Запад'}${round.count===4?' · матч '+(i+1):''}`,game:fixtures[i]}))})
}
watch([year,stage],()=>{void router.replace({query:{year:String(year.value),stage:stage.value}})})
watch(()=>[route.query.year,route.query.stage],()=>{const y=Number(route.query.year);year.value=years.includes(y)?y:years[0]!;stage.value=route.query.stage==='bracket'?'bracket':'groups'})
usePageTitle(()=>`Emirates NBA Cup ${year.value}`)
</script>
