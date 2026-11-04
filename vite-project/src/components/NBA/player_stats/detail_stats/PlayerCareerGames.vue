<template>
  <div class="space-y-5">
    <p v-if="data.unavailable.length" role="status" class="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Данные по части сезонов недоступны ({{ data.unavailable.join(', ') }}). Ниже результаты по полученным протоколам.</p>
    <p v-if="!data.games" class="text-sm text-slate-500">Протоколы карьеры пока недоступны.</p>
    <template v-else>
      <div>
        <h2 class="text-xl font-black text-slate-900">Лучшие матчи карьеры</h2>
        <p class="mt-1 text-sm text-slate-500">Регулярный сезон и плей-офф. Сортировка по очкам, при равенстве — по сумме подборов и передач.</p>
        <ul class="mt-3 grid gap-3 sm:grid-cols-2">
          <li v-for="game in data.best" :key="game.id">
            <RouterLink :to="gameLocation(game)" class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:border-blue-400">
              <div class="min-w-0"><p class="font-bold text-slate-900">Против {{ game.opponent }} <span class="text-xs text-slate-400">↗</span></p>
                <p class="text-xs text-slate-500">{{ dateLabel(game.date) }} · {{ game.stage==='playoffs' ? 'Плей-офф' : 'Регулярный сезон' }}</p>
                <p class="mt-1 text-xs text-slate-600">{{ game.rebounds }} подб. · {{ game.assists }} пер. · {{ game.steals }} перехв. · {{ game.blocks }} бл.</p></div>
              <strong class="shrink-0 text-blue-700">{{ game.points }} оч.</strong>
            </RouterLink>
          </li>
        </ul>
      </div>
      <div>
        <h2 class="text-xl font-black text-slate-900">Против каждой команды</h2>
        <p class="mt-1 text-sm text-slate-500">{{ data.games }} матчей карьеры. Статистика за матч, регулярный сезон и плей-офф вместе.</p>
        <div class="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table class="w-full min-w-[38rem] text-left text-sm">
            <thead class="bg-slate-100">
              <tr>
                <th scope="col" class="p-2.5">Команда</th>
                <th v-for="[key,label] in columns" :key="key" scope="col" :aria-sort="sortBy===key ? 'descending' : undefined">
                  <button type="button" class="inline-flex w-full items-center gap-1 whitespace-nowrap p-2.5 text-left font-bold hover:text-blue-700" :class="{ 'text-blue-700':sortBy===key }" @click="sortBy=key">
                    {{ label }}<span aria-hidden="true" class="w-3">{{ sortBy===key ? '↓' : '' }}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100"><tr v-for="team in opponents" :key="team.team">
              <th scope="row" class="min-w-44 p-2.5 font-bold">
                <RouterLink :to="{name:'TeamDetail',params:{abbr:team.team}}" class="inline-flex items-center gap-2 hover:text-blue-700 hover:underline">
                  <img :src="getTeamLogo(team.team)" alt="" loading="lazy" class="h-7 w-7 shrink-0 object-contain" />
                  <span>{{ teamsFullNames[team.team] || team.team }}</span>
                </RouterLink>
              </th>
              <td v-for="[key] in columns" :key="key" class="p-2.5 tabular-nums">{{ points(statValue(team,key)) }}</td>
            </tr></tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { teamsFullNames } from '../../../../constants/TeamFullName'
import { getTeamLogo } from '../../../../utils/getTeamLogo'
import { gameLocation } from '../../../../api/gameNavigation'
import { points } from '../../../Fantasy/types'
import type { ProfileGames } from './playerProfileData'
const props = defineProps<{ data: ProfileGames }>()
const columns = [
  ['games','Игры'], ['wins','Победы'], ['points','Очки'], ['rebounds','Подборы'],
  ['assists','Передачи'], ['steals','Перехваты'], ['blocks','Блоки'], ['turnovers','Потери']
] as const
type StatKey = typeof columns[number][0]
const sortBy = ref<StatKey | null>(null)

function statValue(team: ProfileGames['opponents'][number], key: StatKey) {
  return key==='games' || key==='wins' ? team[key] : team[key]/team.games
}

const opponents = computed(() => {
  const key = sortBy.value
  if (!key) return props.data.opponents
  return [...props.data.opponents].sort((a,b) => statValue(b,key)-statValue(a,key))
})
const dateLabel = (value: string) => new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeZone:'Europe/Moscow'}).format(new Date(value))
</script>
