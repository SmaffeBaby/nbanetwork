<template>
  <div class="standings space-y-4 sm:space-y-6">
    <header class="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div class="min-w-0">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600 sm:text-xs">NBA · Регулярный чемпионат</p>
        <h1 class="standings-title mt-2 font-black tracking-tight text-slate-900">Турнирная таблица</h1>
        <p class="mt-2 text-xs leading-5 text-slate-500 sm:text-sm">Положение команд в Восточной и Западной конференциях</p>
      </div>
      <label class="flex shrink-0 items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 sm:min-w-44 sm:flex-col sm:items-start sm:gap-1">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Сезон</span>
        <select v-model="selectedSeason" aria-label="Сезон турнирной таблицы" class="min-h-9 max-w-full rounded-lg border-0 bg-transparent pr-6 text-sm font-extrabold text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><option v-for="season in seasons" :key="season" :value="season">{{ season }}</option></select>
      </label>
    </header>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white p-1 sm:min-w-80" role="group" aria-label="Конференция">
        <button v-for="item in filters" :key="item.key" type="button" :aria-pressed="filter === item.key" class="min-h-11 rounded-xl px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm" :class="filter === item.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'" @click="filter = item.key">{{ item.label }}</button>
      </div>
      <label class="flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-xl px-1 text-xs font-semibold text-slate-600 sm:text-sm"><input v-model="detailed" type="checkbox" class="h-4 w-4 rounded accent-blue-600" />Подробная статистика</label>
    </div>

    <div v-if="error" role="alert" class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700"><p>Не удалось загрузить таблицу сезона {{ selectedSeason }}.</p><button type="button" class="min-h-10 rounded-xl bg-white px-4 py-2 font-bold shadow-sm disabled:opacity-50" :disabled="loading" @click="fetchStandings">Повторить</button></div>
    <div v-if="loading" class="rounded-3xl border border-slate-200 bg-white p-5" role="status"><p class="text-sm text-slate-500">Загружаем таблицу сезона {{ selectedSeason }}…</p><div aria-hidden="true" class="mt-5 space-y-3 motion-safe:animate-pulse"><div v-for="row in 6" :key="row" class="h-16 rounded-xl bg-slate-100" /></div></div>
    <p v-else-if="!error && !teams.length" class="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Таблица выбранного сезона пока недоступна.</p>

    <template v-if="!loading && teams.length">
      <div class="flex flex-wrap gap-x-4 gap-y-2 px-1 text-[11px] text-slate-500"><span class="inline-flex items-center gap-1.5"><i aria-hidden="true" class="h-2 w-2 rounded-full bg-blue-500" />Места 1–6</span><span class="inline-flex items-center gap-1.5"><i aria-hidden="true" class="h-2 w-2 rounded-full bg-amber-400" />Места 7–10</span><span class="inline-flex items-center gap-1.5"><i aria-hidden="true" class="h-2 w-2 rounded-full bg-slate-300" />Места 11+</span></div>
      <section v-for="conf in visibleConferences" :key="conf.name" class="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white" :aria-labelledby="`${headingId}-${conf.name}`">
        <header class="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><div class="flex min-w-0 items-center gap-3"><img :src="conf.logo" alt="" class="h-11 w-11 shrink-0 object-contain sm:h-14 sm:w-14" /><div><p class="text-[10px] font-bold uppercase tracking-widest" :class="conf.name === 'East' ? 'text-blue-600' : 'text-rose-600'">{{ conf.name === 'East' ? 'Eastern' : 'Western' }}</p><h2 :id="`${headingId}-${conf.name}`" class="m-0 text-base font-extrabold text-slate-900 sm:text-xl">{{ conf.label }}</h2></div></div><span class="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">{{ getTeams(conf.name).length }} команд</span></header>
        <p v-if="!getTeams(conf.name).length" class="p-6 text-sm text-slate-500">Данные этой конференции пока недоступны.</p>

        <ol v-else class="md:hidden">
          <li v-for="(team, i) in getTeams(conf.name)" :key="team.TeamID" class="border-b border-slate-100 last:border-0" :class="{ 'zone-divider': i === 6 || i === 10 }">
            <RouterLink :to="teamLink(team)" class="block px-3 py-3 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-4">
              <div class="flex items-center gap-2.5">
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black tabular-nums" :class="rankClass(i)">{{ i + 1 }}</span>
                <img v-if="getLogo(team)" :src="getLogo(team)" alt="" class="h-9 w-9 shrink-0 object-contain" loading="lazy" />
                <span class="min-w-0 flex-1"><span class="block break-words text-[13px] font-extrabold leading-4 text-slate-900">{{ team.TeamCity }} {{ team.TeamName }}</span><span class="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-slate-500"><span>{{ winPercent(team) }} побед</span><span>Отст. {{ getField(team, 'ConferenceGamesBack', 'GamesBehind') }}</span><span class="font-bold" :class="streakClass(team)">{{ streak(team) }}</span></span></span>
                <span class="shrink-0 text-right"><strong class="block whitespace-nowrap text-base font-black tabular-nums text-slate-900">{{ getField(team, 'WINS', 'W') }}–{{ getField(team, 'LOSSES', 'L') }}</strong><span class="text-[10px] font-medium text-slate-400" title="Победы — поражения">П–Пр</span></span>
              </div>
              <dl v-if="detailed" class="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5"><div v-for="column in extraColumns" :key="column.label"><dt class="text-[10px] text-slate-500">{{ column.label }}</dt><dd class="mt-0.5 text-xs font-bold tabular-nums text-slate-800">{{ getField(team, ...column.keys) }}</dd></div></dl>
            </RouterLink>
          </li>
        </ol>

        <div v-if="getTeams(conf.name).length" class="hidden md:block">
          <div class="standings-scroll overflow-x-auto overscroll-x-contain" tabindex="0" role="region" :aria-label="`Таблица: ${conf.label}. При необходимости прокрутите по горизонтали`">
            <table class="w-full border-collapse text-left text-sm tabular-nums" :class="detailed ? 'min-w-[1080px]' : 'min-w-[660px]'">
              <caption class="sr-only">{{ conf.label }} · сезон {{ selectedSeason }}</caption>
              <thead class="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500"><tr>
                <th scope="col" class="w-12 px-4 py-3 text-center">#</th><th scope="col" class="team-column min-w-52 bg-slate-50 px-3 py-3">Команда</th>
                <th scope="col" class="px-3 py-3 text-center" title="Победы">П</th><th scope="col" class="px-3 py-3 text-center" title="Поражения">Пр</th><th scope="col" class="px-3 py-3 text-center" title="Процент побед">Победы %</th><th scope="col" class="px-3 py-3 text-center" title="Отставание от лидера конференции в победах">Отст.</th>
                <template v-if="detailed"><th v-for="column in extraColumns" :key="column.label" scope="col" class="whitespace-nowrap px-3 py-3 text-center" :title="column.title">{{ column.label }}</th></template>
                <th scope="col" class="px-4 py-3 text-center" title="Текущая серия побед или поражений">Серия</th>
              </tr></thead>
              <tbody class="divide-y divide-slate-100"><tr v-for="(team, i) in getTeams(conf.name)" :key="team.TeamID" class="group hover:bg-blue-50/40" :class="{ 'zone-divider': i === 6 || i === 10 }">
                <td class="px-3 py-3"><span class="mx-auto flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black" :class="rankClass(i)">{{ i + 1 }}</span></td>
                <th scope="row" class="team-column bg-white px-3 py-3 font-semibold group-hover:bg-blue-50"><RouterLink :to="teamLink(team)" class="flex items-center gap-3 rounded-lg text-slate-900 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><img v-if="getLogo(team)" :src="getLogo(team)" alt="" class="h-8 w-8 shrink-0 object-contain" loading="lazy" /><span class="whitespace-nowrap text-xs lg:text-sm">{{ team.TeamCity }} {{ team.TeamName }}</span></RouterLink></th>
                <td class="px-3 py-3 text-center font-extrabold text-slate-900">{{ getField(team, 'WINS', 'W') }}</td><td class="px-3 py-3 text-center text-slate-500">{{ getField(team, 'LOSSES', 'L') }}</td><td class="px-3 py-3 text-center font-semibold text-slate-700">{{ winPercent(team) }}</td><td class="px-3 py-3 text-center text-slate-500">{{ getField(team, 'ConferenceGamesBack', 'GamesBehind') }}</td>
                <template v-if="detailed"><td v-for="column in extraColumns" :key="column.label" class="whitespace-nowrap px-3 py-3 text-center text-slate-600">{{ getField(team, ...column.keys) }}</td></template>
                <td class="whitespace-nowrap px-4 py-3 text-center"><span class="rounded-lg px-2 py-1 text-xs font-bold" :class="streakClass(team)">{{ streak(team) }}</span></td>
              </tr></tbody>
            </table>
          </div>
          <p v-if="detailed" class="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">Если столбцы не помещаются, прокрутите таблицу по горизонтали. Названия команд остаются на месте.</p>
        </div>
      </section>
      <p class="px-1 text-[11px] leading-5 text-slate-400">П — победы, Пр — поражения, Отст. — отставание от лидера. В серии: П — победы, Пр — поражения. Выделение строк показывает текущее место в конференции.</p>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { RouterLink } from 'vue-router'
import { useStandings } from '../../../composables/NBA/Standings/useStandings'
import { TEAM_ID_MAP } from '../../../constants/nbaTeams'
const { teams, loading, error, selectedSeason, seasons, getLogo, getTeams, getField, fetchStandings } = useStandings()
type Conference = 'East' | 'West' | 'all'
const filter = ref<Conference>('East'), detailed = ref(false), headingId = useId()
const filters: { key: Conference; label: string }[] = [{ key: 'East', label: 'Восток' }, { key: 'West', label: 'Запад' }, { key: 'all', label: 'Все' }]
const conferences = [{ name: 'East', label: 'Восточная конференция', logo: '/logos/EASTERN.svg' }, { name: 'West', label: 'Западная конференция', logo: '/logos/WESTERN.svg' }]
const visibleConferences = computed(() => conferences.filter(conf => filter.value === 'all' || conf.name === filter.value))
const extraColumns = [
  { label: 'Дома', title: 'Победы и поражения дома', keys: ['HOME'] },
  { label: 'В гостях', title: 'Победы и поражения на выезде', keys: ['ROAD'] },
  { label: 'Посл. 10', title: 'Последние десять матчей', keys: ['L10', 'LastTenGames'] },
  { label: 'Конф.', title: 'Матчи внутри конференции', keys: ['ConferenceRecord'] },
  { label: 'Див.', title: 'Матчи внутри дивизиона', keys: ['DivisionRecord'] }
]
const idToTeam = Object.fromEntries(Object.entries(TEAM_ID_MAP).filter(([abbr]) => abbr !== 'NJN').map(([abbr, id]) => [id, abbr]))
const teamLink = (team: Record<string, any>) => `/team/${idToTeam[team.TeamID] || team.TeamAbbreviation || ''}`
const rankClass = (index: number) => index < 6 ? 'bg-blue-50 text-blue-700' : index < 10 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
function winPercent(team: Record<string, any>) {
  const value = getField(team, 'WinPCT')
  return value === '-' || !Number.isFinite(Number(value)) ? '—' : `${(Number(value) * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`
}
function streak(team: Record<string, any>) {
  return String(getField(team, 'strCurrentStreak', 'CurrentStreak')).replace(/^W\s*/i, 'П ').replace(/^L\s*/i, 'Пр ')
}
const streakClass = (team: Record<string, any>) => /^W/i.test(String(getField(team, 'strCurrentStreak', 'CurrentStreak'))) ? 'bg-emerald-50 text-emerald-700' : /^L/i.test(String(getField(team, 'strCurrentStreak', 'CurrentStreak'))) ? 'bg-rose-50 text-rose-600' : 'text-slate-400'
</script>
<style scoped>
.standings-title { margin: 8px 0 0; font-size: clamp(1.65rem, 3.2vw, 2.5rem); line-height: 1.15; }
.zone-divider { border-top: 2px dashed #cbd5e1; }
.team-column { position: sticky; left: 0; z-index: 1; }
.standings-scroll:focus-visible { outline: 2px solid #3b82f6; outline-offset: -2px; }
</style>
