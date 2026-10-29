<template>
  <Header />
  <main class="mx-auto max-w-7xl space-y-6 px-4 pb-16 pt-28 sm:px-8 sm:pt-36">
    <section class="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-9">
      <div class="pointer-events-none absolute -right-12 -top-24 h-80 w-80 rounded-full border-[40px] border-blue-500/15" />
      <p class="text-xs font-bold uppercase tracking-[0.22em] text-blue-300">Basketsfera · Fantasy League</p>
      <h1 class="mt-3 text-3xl font-black sm:text-5xl">{{ edition.season }} Сезон · {{ edition.week }} неделя</h1>
      <p class="mt-4 max-w-xl text-sm leading-6 text-slate-300">Собери команду из звёзд НБА, зарабатывай очки за их реальные матчи и поднимайся в рейтинге.</p>
      <div v-if="board" class="mt-6 flex flex-wrap gap-3 text-xs font-bold">
        <span class="rounded-full bg-white/10 px-3 py-2">Неделя с {{ weekLabel(board.week.id) }}</span>
        <span class="rounded-full bg-blue-500/20 px-3 py-2 text-blue-200">{{ closed ? 'Неделя завершена' : `Итоги ${dateTime(board.week.end)} МСК` }}</span>
        <span class="rounded-full bg-white/10 px-3 py-2">{{ board.participants }} участников этой недели</span>
      </div>
    </section>

    <p v-if="error" role="alert" class="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{{ error }} <button class="ml-2 font-bold underline" @click="refresh">Повторить</button></p>
    <p v-if="!board && loading" class="py-8 text-center text-slate-500" role="status">Загружаем фентези…</p>
    <section v-if="board" class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div><p class="text-xs font-bold uppercase tracking-widest text-blue-600">{{ entry ? 'Состав закреплён' : 'Собери состав' }}</p><h2 class="mt-1 text-xl font-extrabold text-slate-900">Моя пятёрка <span v-if="entry" class="ml-2 text-blue-600">{{ points(entry.points) }} оч.</span></h2></div>
        <p v-if="entry" class="text-sm text-slate-500">Место #{{ entry.rank }} · {{ entry.player_games }} выходов на площадку</p>
        <span v-else class="text-sm font-bold text-slate-500">{{ picks.length }} / 5 игроков</span>
      </div>
      <div v-if="entry" class="mt-5 grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-5">
        <FantasyPlayerCard v-for="player in currentLineup" :key="player.slot" :player="player" :position="player.slot" :fantasy-points="Number(entry.player_points?.[player.id] || 0)" :profile-id="auth.user?.id" :player-xp="progress.totals[player.id] ?? 0" selected />
      </div>
      <template v-else>
        <div class="mt-5 grid grid-cols-5 gap-2">
          <button v-for="slot in slots" :key="slot" class="min-w-0 rounded-xl border p-2 text-center transition sm:p-4" :class="activeSlot === slot ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'" @click="activeSlot = slot; reviewing = false">
            <strong class="text-sm">{{ slot }}</strong>
            <img v-if="pickAt(slot)" :src="`https://a.espncdn.com/i/headshots/nba/players/full/${pickAt(slot)!.id}.png`" alt="" class="mx-auto mt-2 h-12 w-full object-contain" @error="($event.target as HTMLImageElement).style.visibility = 'hidden'" />
            <span v-else class="my-3 block text-xl text-slate-300" aria-hidden="true">＋</span>
            <span class="block truncate text-[10px] sm:text-xs">{{ pickAt(slot)?.name || 'Выбрать' }}</span>
          </button>
        </div>
        <p v-if="!auth.user" class="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">Войдите в аккаунт через меню, чтобы подтвердить состав и участвовать в рейтинге.</p>
        <p v-if="closed" class="mt-4 text-sm text-slate-500">Итоги зафиксированы. Новая неделя начнётся {{ dateTime(board.week.next) }} МСК.</p>
        <div v-if="reviewing" class="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 class="font-bold text-blue-950">Закрепить эту пятёрку на неделю?</h3>
          <p class="mt-2 text-sm text-blue-900">{{ picks.map(p => `${p.slot}: ${p.name}`).join(' · ') }}</p>
          <p class="mt-2 text-sm text-blue-900">После подтверждения замены недоступны. Очки начисляются только за матчи, начавшиеся после закрепления.</p>
          <div class="mt-3 flex flex-wrap gap-3"><button :disabled="saving || closed" class="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50" @click="confirmLineup">{{ saving ? 'Проверяем травмы и сохраняем…' : 'Подтвердить состав' }}</button><button :disabled="saving" class="px-4 py-3 text-sm font-bold text-blue-800" @click="reviewing = false">Вернуться к выбору</button></div>
        </div>
        <button v-else class="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400" :disabled="picks.length !== 5 || !auth.user || closed || loading" @click="reviewing = true">Проверить и закрепить состав</button>
      </template>
      <p v-if="entry" class="mt-4 text-xs leading-5 text-slate-500">Закреплён {{ dateTime(entry.confirmed_at) }} МСК. {{ entry.updated_at ? `Последнее начисление: ${dateTime(entry.updated_at)} МСК.` : 'Ожидаем завершённые матчи вашей пятёрки.' }} История доступна в профиле.</p>
      <p v-if="success" role="status" class="mt-3 font-semibold text-emerald-700">Состав закреплён. Удачной недели!</p>
    </section>

    <section v-if="board && !entry && !closed" class="space-y-4">
      <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><h2 class="text-xl font-extrabold text-slate-900">Выбери {{ activeSlot }}</h2><p class="mt-1 text-sm text-slate-500">Следующий матч — прямо на карточке игрока</p></div>
        <PublicProfileTeamFilter v-model="team" :teams="eligibleTeams" /><label class="text-sm text-slate-600"><span class="sr-only">Найти игрока или команду</span><input v-model="search" type="search" placeholder="Игрок или команда…" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 sm:w-64" /></label>
      </div>
      <div class="flex flex-wrap gap-2"><button v-for="slot in slots" :key="slot" class="rounded-full px-4 py-2 text-sm font-bold" :class="activeSlot === slot ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'" @click="activeSlot = slot">{{ slot }}</button><label class="ml-auto flex items-center gap-2 text-sm text-slate-500"><input v-model="healthyOnly" type="checkbox" /> Только доступные</label></div>
      <p v-if="playersLoading && !players.length" role="status" class="py-8 text-center text-slate-500">Проверяем расписание и составы команд…</p>
      <div v-else-if="playersError && !players.length" role="alert" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{{ playersError }} <button class="font-bold underline" @click="loadPlayers">Повторить</button></div>
      <div v-else-if="filtered.length" class="grid grid-cols-1 gap-4 min-[460px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <FantasyPlayerCard v-for="player in visiblePlayers" :key="player.id" :player="player" :position="activeSlot" :profile-id="auth.user?.id" :player-xp="auth.user ? progress.totals[player.id] ?? 0 : undefined" :selected="pickAt(activeSlot)?.id === player.id" selectable :disabled="!!player.injury || player.remaining < 1 || picks.some(p => p.id === player.id && p.slot !== activeSlot) || saving" @select="selectPlayer(player)" />
      </div>
      <p v-else class="rounded-2xl bg-white p-8 text-center text-slate-500">Игроки не найдены. Измените поиск или фильтр; в межсезонье каталог может быть пустым.</p>
      <button v-if="filtered.length > limit" class="block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700" @click="limit += 30">Показать ещё</button>
    </section>

    <section v-if="board" class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="text-xl font-extrabold text-slate-900">Рейтинг профилей</h2><div class="flex gap-2"><button class="rounded-lg px-3 py-2 text-sm font-bold" :class="!overall ? 'bg-blue-50 text-blue-700' : 'text-slate-500'" @click="overall = false">За неделю</button><button class="rounded-lg px-3 py-2 text-sm font-bold" :class="overall ? 'bg-blue-50 text-blue-700' : 'text-slate-500'" @click="overall = true">За всё время</button></div></div>
      <div v-if="!overall" class="mt-4 flex items-center justify-between gap-3 text-sm"><button class="rounded-lg border border-slate-200 px-3 py-2" :disabled="loading" aria-label="Предыдущая неделя" @click="changeWeek(-7)">←</button><span>Неделя с {{ weekLabel(board.selectedWeek) }}</span><button class="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-30" :disabled="board.selectedWeek >= board.week.id || loading" aria-label="Следующая неделя" @click="changeWeek(7)">→</button></div>
      <p v-if="!leaders.length" class="py-10 text-center text-sm text-slate-500">Пока нет участников. Закрепите состав и откройте рейтинг.</p>
      <ol v-else class="mt-4 divide-y divide-slate-100"><li v-for="leader in leaders" :key="leader.user_id" class="flex items-center gap-3 py-4" :class="leader.user_id === auth.user?.id ? 'rounded-xl bg-blue-50 px-3' : ''"><span class="w-8 text-lg font-black" :class="leader.rank <= 3 ? 'text-amber-500' : 'text-slate-400'">{{ leader.rank }}</span><RouterLink :to="`/profile/${leader.user_id}`" class="min-w-0 flex-1 truncate text-sm font-bold text-slate-800 hover:text-blue-600">{{ [leader.first_name, leader.last_name].filter(Boolean).join(' ') || 'Участник' }}<span v-if="leader.user_id === auth.user?.id" class="ml-1 text-blue-600">· вы</span></RouterLink><span class="font-black text-slate-900">{{ points(leader.points) }} <span class="text-xs font-medium text-slate-400">оч.</span></span></li></ol>
      <p v-if="leaders.length" class="mt-3 text-xs text-slate-400">Топ-100 · равные очки — общее место · обновление раз в минуту</p>
    </section>
    <FantasyRules />
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import PublicProfileTeamFilter from '../components/NBA/PublicProfile/PublicProfileTeamFilter.vue'
import { teamsFullNames } from '../constants/TeamFullName'
import Header from '../components/Headers/Header.vue'
import FantasyPlayerCard from '../components/Fantasy/FantasyPlayerCard.vue'
import FantasyRules from '../components/Fantasy/FantasyRules.vue'
import { playerProgress } from '../components/Fantasy/progress'
import { slots, points, dateTime, weekLabel, type Slot, type Player, type Pick, type Board } from '../components/Fantasy/types'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { authFetch } from '../api/authFetch'
const auth = useAuthStore()
const route = useRoute()
const board = ref<Board | null>(null), players = ref<Player[]>([]), picks = ref<Pick[]>([])
const team = ref('all')
const eligibleTeams = computed(() => [...new Set(players.value.map(p => p.team))].sort().map(abbr => ({ abbr, name: teamsFullNames[abbr] || abbr })))
const edition = computed(() => {
  const id = board.value?.week.id || '2026-10-26'
  const date = new Date(`${id}T12:00:00Z`)
  let year = date.getUTCFullYear()
  const anchor = (year: number) => { const d = new Date(Date.UTC(year,9,26)); d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7); return +d }
  if (+date < anchor(year)) year--
  return { season: Math.max(1, year-2025), week: Math.max(1, Math.floor((+date-anchor(year))/604800000)+1) }
})
const activeSlot = ref<Slot>('PG'), search = ref(''), healthyOnly = ref(false), overall = ref(false), selectedWeek = ref(typeof route.query.week === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.week) ? route.query.week : ''), limit = ref(30)
const loading = ref(false), playersLoading = ref(false), saving = ref(false), reviewing = ref(false), success = ref(false)
const error = ref(''), playersError = ref(''), now = ref(Date.now())
const closed = computed(() => !!board.value && now.value >= Date.parse(board.value.week.end))
const entry = computed(() => board.value?.history.find(e => e.week === board.value?.week.id))
const currentLineup = computed(() => (entry.value?.lineup || []).map(p => ({ ...p, ...players.value.find(player => player.id === p.id) })))
const progress = computed(() => playerProgress(board.value?.history || []))
const leaders = computed(() => (overall.value ? board.value?.overall : board.value?.leaderboard) || [])
const pickAt = (slot: Slot) => picks.value.find(p => p.slot === slot)
const filtered = computed(() => players.value.filter(p => p.positions.includes(activeSlot.value) && (team.value === 'all' || p.team === team.value) && (!healthyOnly.value || (!p.injury && p.remaining > 0)) && `${p.name} ${p.team}`.toLowerCase().includes(search.value.trim().toLowerCase())))
const visiblePlayers = computed(() => filtered.value.slice(0, limit.value))
watch([activeSlot, search, healthyOnly, team], () => { limit.value = 30 })
let requestId = 0
async function loadBoard() {
  const id = ++requestId
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (auth.user?.id) params.set('profile', auth.user.id)
    if (selectedWeek.value) params.set('week', selectedWeek.value)
    const data: Board = await authFetch(`/api/fantasy?${params}`)
    if (id !== requestId) return
    if (board.value && board.value.week.id !== data.week.id) { picks.value = []; reviewing.value = false; void loadPlayers() }
    board.value = data
    error.value = ''
  } catch (e: any) { if (id === requestId) error.value = e.message }
  finally { if (id === requestId) loading.value = false }
}
let playerRequestId = 0
async function loadPlayers() {
  const id = ++playerRequestId
  playersLoading.value = true
  try {
    const data = await authFetch('/api/fantasy/players')
    if (id !== playerRequestId) return
    players.value = data.players
    playersError.value = ''
  } catch (e: any) { if (id === playerRequestId) playersError.value = e.message }
  finally { if (id === playerRequestId) playersLoading.value = false }
}
function selectPlayer(player: Player) {
  if (saving.value || entry.value || closed.value || player.injury || player.remaining < 1) return
  picks.value = [...picks.value.filter(p => p.slot !== activeSlot.value), { id: player.id, name: player.name, team: player.team, slot: activeSlot.value }]
  reviewing.value = false
  const next = slots.find(slot => !pickAt(slot))
  if (next) activeSlot.value = next
}
async function confirmLineup() {
  if (saving.value || !board.value || !auth.user) return
  saving.value = true; error.value = ''
  try {
    await authFetch('/api/fantasy/lineup', { method: 'POST', body: JSON.stringify({ week: board.value.week.id, lineup: picks.value.map(p => ({ id: p.id, slot: p.slot })) }) })
    success.value = true; reviewing.value = false
    await loadBoard()
  } catch (e: any) { error.value = e.message; void loadPlayers(); await loadBoard(); error.value = e.message }
  finally { saving.value = false }
}
function changeWeek(days: number) {
  if (!board.value) return
  const date = new Date(`${board.value.selectedWeek}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  selectedWeek.value = date.toISOString().slice(0, 10)
  void loadBoard()
}
function refresh() { void loadBoard(); if (!closed.value) void loadPlayers() }
watch(() => auth.user?.id, () => { picks.value = []; reviewing.value = false; success.value = false; board.value = null; void loadBoard() })
let poll: ReturnType<typeof setInterval>, clock: ReturnType<typeof setInterval>
onMounted(() => { refresh(); poll = setInterval(() => { if (!document.hidden && !saving.value) refresh() }, 60000); clock = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => { clearInterval(poll); clearInterval(clock); requestId++; playerRequestId++ })
</script>
