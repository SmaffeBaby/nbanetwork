<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div class="flex flex-wrap items-center justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-widest text-blue-600">Fantasy League</p><h2 class="mt-1 text-xl font-extrabold text-slate-900">Фентези</h2></div><RouterLink :to="{path:'/fantasy',query:{mode:activeMode==='legacy'?'unlimited':activeMode}}" class="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">Состав и рейтинг →</RouterLink></div>
    <div class="mt-5"><FantasyPlayerTabs v-model="activeMode" :id="tabsId" :tabs="modeTabs" label="Режим фентези профиля" /></div>
    <p v-if="loading" class="mt-5 text-sm text-slate-500" role="status">Загружаем историю…</p>
    <p v-else-if="error" class="mt-5 text-sm text-rose-600" role="alert">{{ error }} <button class="font-bold underline" @click="load">Повторить</button></p>
    <div v-else :id="`${tabsId}-panel-${activeMode}`" role="tabpanel" :aria-labelledby="`${tabsId}-tab-${activeMode}`">
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3"><p class="text-sm text-slate-500">{{ activeMode==='legacy'?'Сохранённые недельные турниры по прежним правилам.':'Статистика и составы только выбранного режима. Личный XP игроков общий.' }}</p><p v-if="modeRank" class="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">Общий рейтинг: #{{ modeRank.rank }} из {{ modeRank.participants }}</p></div>
      <div v-if="activeMode!=='legacy'" class="mt-4 flex flex-wrap items-center gap-3"><FantasyCalendar v-model="selectedDay" :entries="history" placeholder="Календарь составов" /><button v-if="selectedDay" type="button" class="text-xs font-bold text-blue-600" @click="selectedDay=''">Все даты ×</button></div>
      <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><div v-for="stat in stats" :key="stat.label" class="rounded-xl bg-slate-50 p-3"><p class="text-xl font-black text-slate-900">{{ stat.value }}</p><p class="mt-1 text-xs text-slate-500">{{ stat.label }}</p></div></div>
      <div class="mt-6">
        <h3 class="text-lg font-extrabold text-slate-900">Лучшие игроки фентези</h3>
        <p class="mt-1 text-xs leading-5 text-slate-500">Лидеры выбранного режима по сумме баллов на каждой позиции. Уровень игрока общий для всех его позиций и сохраняется между игровыми днями.</p>
        <div class="mt-4 grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-5">
          <template v-for="item in progress.best" :key="item.slot">
            <FantasyPlayerCard v-if="item.leader" :player="item.leader.player" :position="item.slot" :profile-id="profileId" :mode="activeMode as 'unlimited' | 'balanced' | 'legacy'" :week="latestEntry(item.leader.player.id)?.week" :player-xp="progress.totals[item.leader.player.id]" :fantasy-points="item.leader.points" />
            <div v-else class="rounded-2xl border border-dashed border-slate-200 p-5"><p class="text-sm font-black text-slate-700">{{ item.slot }}</p><p class="mt-2 text-xs text-slate-500">Пока нет игроков на этой позиции</p></div>
          </template>
        </div>
      </div>
      <p v-if="!displayHistory.length" class="mt-5 text-sm leading-6 text-slate-500">Пока нет подтверждённых составов. Каждый закреплённый турнир появится здесь вместе с очками, местом и пятёркой игроков.</p>
      <div v-else class="mt-5 space-y-3">
        <details v-for="entry in displayHistory" :key="`${entry.week}:${entry.mode}`" class="rounded-xl border border-slate-200 p-4">
          <summary class="cursor-pointer text-sm font-bold text-slate-800"><span>{{ entry.mode === 'legacy' ? 'Архив · неделя с' : entry.mode === 'balanced' ? 'Баланс-фентези ·' : 'Без ограничений ·' }} {{ weekLabel(entry.week) }}</span><span class="ml-2 text-blue-600">{{ points(entry.points) }} оч. · #{{ entry.rank }}</span><span class="ml-2 text-xs font-medium text-slate-400">{{ (entry.mode === 'legacy' ? Date.now() >= Date.parse(entry.ends_at) : entry.settled) ? 'Итог' : 'В процессе' }}</span></summary>
          <p class="my-3 text-xs text-slate-500">Закреплён {{ dateTime(entry.confirmed_at) }} МСК · {{ entry.player_games }} выходов на площадку</p>
          <div class="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-5"><FantasyPlayerCard v-for="player in entry.lineup" :key="player.slot" :player="player" :week="entry.week" :mode="entry.mode" :profile-id="profileId" :player-xp="progress.totals[player.id]" :position="player.slot" :fantasy-points="Number(entry.player_points?.[player.id] || 0)" /></div>
          <RouterLink :to="{ path: '/fantasy', query: entry.mode === 'legacy' ? { week: entry.week } : { day: entry.week, mode: entry.mode } }" class="mt-4 inline-block text-sm font-bold text-blue-600">Открыть турнир →</RouterLink>
        </details>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { playerProgress } from './progress'
import { computed, onUnmounted, ref, watch, useId } from 'vue'
import { authFetch } from '../../api/authFetch'
import FantasyPlayerCard from './FantasyPlayerCard.vue'
import FantasyPlayerTabs from './FantasyPlayerTabs.vue'
import FantasyCalendar from './FantasyCalendar.vue'
import { dateTime, points, weekLabel, type Entry } from './types'
const props = defineProps<{ profileId: string }>()
const tabsId=useId(),activeMode=ref('unlimited'),selectedDay=ref('')
watch(activeMode,()=>{selectedDay.value=''})
const modeTabs=[{id:'unlimited',label:'Без ограничений'},{id:'balanced',label:'Баланс-фентези'},{id:'legacy',label:'Архив недель'}]
const ranks=ref<Record<string,{rank:number;participants:number}>>({})
const modeRank=computed(()=>ranks.value[activeMode.value])
const visibleHistory=computed(()=>history.value.filter(e=>e.mode===activeMode.value))
const displayHistory=computed(()=>visibleHistory.value.filter(e=>!selectedDay.value||e.week===selectedDay.value))
const latestEntry=(id:string)=>visibleHistory.value.find(e=>e.lineup.some(p=>p.id===id))
const history = ref<Entry[]>([]), loading = ref(false), error = ref('')
const playerXp = ref<Record<string,number>>({})
const progress = computed(() => ({...playerProgress(visibleHistory.value),totals:playerXp.value}))
const stats = computed(() => {
  const completed = visibleHistory.value.filter(e => e.mode === 'legacy' ? Date.now() >= Date.parse(e.ends_at) : e.settled)
  const total=visibleHistory.value.reduce((sum,e)=>sum+Number(e.points),0)
  return [{label:'Очки за всё время',value:points(total)},{label:'Подтверждено составов',value:visibleHistory.value.length},
    {label:'Завершено турниров',value:completed.length},{label:'Среднее за завершённый турнир',value:completed.length?points(completed.reduce((sum,e)=>sum+Number(e.points),0)/completed.length):'—'},
    {label:'Лучший результат',value:completed.length?points(Math.max(...completed.map(e=>Number(e.points)))):'—'},
    {label:'Побед в турнирах',value:completed.filter(e=>Number(e.rank)===1).length},
    {label:'Лучшее итоговое место',value:completed.length?`#${Math.min(...completed.map(e=>Number(e.rank)))}`:'—'},
    {label:'Матчей игроков',value:visibleHistory.value.reduce((sum,e)=>sum+Number(e.player_games),0)},
    {label:'Бонусы уровня',value:points(visibleHistory.value.reduce((sum,e)=>sum+Object.values(e.player_bonus_points||{}).reduce((s,p)=>s+Number(p),0),0))}]

})
let requestId = 0
async function load() {
  const id = ++requestId
  if (!history.value.length) loading.value = true; error.value = ''
  try {
    const data = await authFetch(`/api/fantasy/profiles/${encodeURIComponent(props.profileId)}`)
    if (id === requestId) { history.value = data.history; playerXp.value = data.playerXp || {}; ranks.value=data.ranks || {} }
  } catch (e: any) { if (id === requestId) error.value = e.message }
  finally { if (id === requestId) loading.value = false }
}
watch(() => props.profileId, () => { history.value = []; selectedDay.value=''; playerXp.value={}; ranks.value={}; void load() }, { immediate: true })
const poll = setInterval(() => { if (!document.hidden) void load() }, 60000)
onUnmounted(() => { requestId++; clearInterval(poll) })
</script>
