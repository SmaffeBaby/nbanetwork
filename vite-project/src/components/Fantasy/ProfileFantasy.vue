<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div class="flex flex-wrap items-center justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-widest text-blue-600">Fantasy League</p><h2 class="mt-1 text-xl font-extrabold text-slate-900">Фентези</h2></div><RouterLink to="/fantasy" class="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">Состав и рейтинг →</RouterLink></div>
    <p v-if="loading" class="mt-5 text-sm text-slate-500" role="status">Загружаем историю…</p>
    <p v-else-if="error" class="mt-5 text-sm text-rose-600" role="alert">{{ error }} <button class="font-bold underline" @click="load">Повторить</button></p>
    <template v-else>
      <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div v-for="stat in stats" :key="stat.label" class="rounded-xl bg-slate-50 p-3"><p class="text-xl font-black text-slate-900">{{ stat.value }}</p><p class="mt-1 text-xs text-slate-500">{{ stat.label }}</p></div></div>
      <div class="mt-6">
        <h3 class="text-lg font-extrabold text-slate-900">Лучшие игроки фентези</h3>
        <p class="mt-1 text-xs leading-5 text-slate-500">Лидеры по сумме баллов за всё время на каждой позиции в составах этого профиля. Уровень игрока общий для всех его позиций и сохраняется между игровыми днями.</p>
        <div class="mt-4 grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-5">
          <template v-for="item in progress.best" :key="item.slot">
            <FantasyPlayerCard v-if="item.leader" :player="item.leader.player" :position="item.slot" :profile-id="profileId" :player-xp="progress.totals[item.leader.player.id]" :fantasy-points="item.leader.points" />
            <div v-else class="rounded-2xl border border-dashed border-slate-200 p-5"><p class="text-sm font-black text-slate-700">{{ item.slot }}</p><p class="mt-2 text-xs text-slate-500">Пока нет игроков на этой позиции</p></div>
          </template>
        </div>
      </div>
      <p v-if="!history.length" class="mt-5 text-sm leading-6 text-slate-500">Пока нет подтверждённых составов. Каждый закреплённый турнир появится здесь вместе с очками, местом и пятёркой игроков.</p>
      <div v-else class="mt-5 space-y-3">
        <details v-for="entry in history" :key="`${entry.week}:${entry.mode}`" class="rounded-xl border border-slate-200 p-4">
          <summary class="cursor-pointer text-sm font-bold text-slate-800"><span>{{ entry.mode === 'legacy' ? 'Архив · неделя с' : entry.mode === 'balanced' ? 'Баланс-фентези ·' : 'Без ограничений ·' }} {{ weekLabel(entry.week) }}</span><span class="ml-2 text-blue-600">{{ points(entry.points) }} оч. · #{{ entry.rank }}</span><span class="ml-2 text-xs font-medium text-slate-400">{{ (entry.mode === 'legacy' ? Date.now() >= Date.parse(entry.ends_at) : entry.settled) ? 'Итог' : 'В процессе' }}</span></summary>
          <p class="my-3 text-xs text-slate-500">Закреплён {{ dateTime(entry.confirmed_at) }} МСК · {{ entry.player_games }} выходов на площадку</p>
          <div class="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-5"><FantasyPlayerCard v-for="player in entry.lineup" :key="player.slot" :player="player" :week="entry.week" :mode="entry.mode" :profile-id="profileId" :player-xp="progress.totals[player.id]" :position="player.slot" :fantasy-points="Number(entry.player_points?.[player.id] || 0)" /></div>
          <RouterLink :to="{ path: '/fantasy', query: entry.mode === 'legacy' ? { week: entry.week } : { day: entry.week, mode: entry.mode } }" class="mt-4 inline-block text-sm font-bold text-blue-600">Открыть турнир →</RouterLink>
        </details>
      </div>
    </template>
  </section>
</template>
<script setup lang="ts">
import { playerProgress } from './progress'
import { computed, onUnmounted, ref, watch } from 'vue'
import { authFetch } from '../../api/authFetch'
import FantasyPlayerCard from './FantasyPlayerCard.vue'
import { dateTime, points, weekLabel, type Board, type Entry } from './types'
const props = defineProps<{ profileId: string }>()
const history = ref<Entry[]>([]), loading = ref(false), error = ref('')
const playerXp = ref<Record<string,number>>({})
const progress = computed(() => ({...playerProgress(history.value),totals:playerXp.value}))
const stats = computed(() => {
  const completed = history.value.filter(e => e.mode === 'legacy' ? Date.now() >= Date.parse(e.ends_at) : e.settled)
  return [{ label: 'Очков за всё время', value: points(history.value.reduce((sum, e) => sum + Number(e.points), 0)) }, { label: 'Подтверждено турниров', value: history.value.length }, { label: 'Лучший турнир', value: completed.length ? points(Math.max(...completed.map(e => Number(e.points)))) : '—' }, { label: 'Лучшее итоговое место', value: completed.length ? `#${Math.min(...completed.map(e => Number(e.rank)))}` : '—' }]
})
let requestId = 0
async function load() {
  const id = ++requestId
  if (!history.value.length) loading.value = true; error.value = ''
  try {
    const data: Board = await authFetch(`/api/fantasy?profile=${encodeURIComponent(props.profileId)}`)
    if (id === requestId) { history.value = data.history; playerXp.value = data.playerXp || {} }
  } catch (e: any) { if (id === requestId) error.value = e.message }
  finally { if (id === requestId) loading.value = false }
}
watch(() => props.profileId, () => { history.value = []; void load() }, { immediate: true })
const poll = setInterval(() => { if (!document.hidden) void load() }, 60000)
onUnmounted(() => { requestId++; clearInterval(poll) })
</script>
