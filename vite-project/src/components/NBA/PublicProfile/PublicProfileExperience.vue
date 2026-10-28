<template>
  <div class="mt-3 w-full min-w-0 md:w-[min(380px,100%)]">
    <button type="button" class="group w-full rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-haspopup="dialog" @click="open = true">
      <span class="flex items-center justify-between gap-3">
        <span class="text-sm font-extrabold text-slate-900">{{ summary ? `Уровень ${level.level}` : summaryQuery.isPending.value ? 'Загружаем прогресс…' : 'Общий уровень' }}</span>
        <span class="text-xs font-bold text-blue-700">Достижения <span aria-hidden="true">↗</span></span>
      </span>
      <span class="mt-2 block h-2 overflow-hidden rounded-full bg-blue-100" role="progressbar" aria-label="Прогресс общего уровня" :aria-valuenow="Math.round(level.percent)" :aria-valuemin="0" :aria-valuemax="100">
        <span class="block h-full rounded-full bg-blue-600 transition-[width] duration-500" :style="{ width: `${level.percent}%` }"></span>
      </span>
      <span class="mt-1.5 flex justify-between gap-3 text-[11px] font-medium text-slate-500"><span>{{ number(level.currentXp) }} / {{ number(level.neededXp) }} XP</span><span>До уровня {{ level.level + 1 }}: {{ number(level.remainingXp) }} XP</span></span>
    </button>
    <p v-if="summaryQuery.isError.value" class="mt-1 text-xs text-red-600">Прогресс временно недоступен. <button class="underline" @click="summaryQuery.refetch()">Повторить</button></p>
  </div>

  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" @click.self="open = false" @keydown.esc="open = false">
      <section ref="dialog" role="dialog" aria-modal="true" aria-labelledby="experience-dialog-title" tabindex="-1" class="flex max-h-[90svh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white text-left text-slate-900 shadow-2xl focus:outline-none">
        <header class="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-blue-50 to-white px-5 py-5 sm:px-7">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-blue-700">{{ dialogHeading.category }}</p>
            <h2 id="experience-dialog-title" class="mt-1 text-2xl font-black">{{ dialogHeading.title }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ dialogHeading.description }}</p>
          </div>
          <button type="button" aria-label="Закрыть достижения" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl hover:bg-slate-50" @click="open = false">×</button>
        </header>
        <div class="overflow-y-auto px-5 py-5 sm:px-7">
          <div class="grid gap-3 sm:grid-cols-4">
            <div class="rounded-xl bg-blue-50 p-3"><p class="text-xs text-slate-500">Всего опыта</p><p class="mt-1 text-xl font-black text-blue-700">{{ number(level.totalXp) }} XP</p></div>
            <div class="rounded-xl bg-slate-50 p-3"><p class="text-xs text-slate-500">Матчей учтено в опыте</p><p class="mt-1 text-xl font-black">{{ number(summary?.watchedCount ?? 0) }}</p></div>
            <div class="rounded-xl bg-slate-50 p-3"><p class="text-xs text-slate-500">Верных прогнозов</p><p class="mt-1 text-xl font-black">{{ number(summary?.correctPredictions ?? 0) }}</p></div>
            <div class="rounded-xl bg-blue-50 p-3"><p class="text-xs text-slate-500">Опыт за фентези</p><p class="mt-1 text-xl font-black text-blue-700">{{ number(summary?.fantasyXp ?? 0) }} XP</p></div>
          </div>
          <details class="mt-4 rounded-xl border border-slate-200 px-4 py-3 text-sm">
            <summary class="cursor-pointer font-bold">Как получить опыт</summary>
            <div class="mt-3 space-y-2 leading-6 text-slate-600"><p><strong class="text-blue-700">+30 XP</strong> за отметку матча «Смотрел». Один матч приносит опыт один раз; снятие и повторная отметка не добавляют баллы.</p><p><strong class="text-blue-700">+100 XP</strong> за верный прогноз победителя, сделанный до начала матча. Опыт начисляется после подтверждения окончательного результата. За отменённые матчи баллы не начисляются.</p><p><strong class="text-blue-700">Фентези: 1 очко = 1 XP.</strong> После каждого завершённого матча суммируются очки вашей пятёрки за этот матч. Положительная сумма добавляется в уровень один раз и сохраняется здесь; отрицательная влияет только на фентези-рейтинг. Дробные очки сохраняются.</p><p>Общий уровень не имеет названий. До уровня 2 нужно 300 XP, до уровня 3 — 900 XP, до уровня 4 — 1800 XP. Каждый следующий уровень требует на 300 XP больше предыдущего.</p><p>Достижения просмотров и команды зависят от текущего списка просмотренных матчей. Уже заработанный опыт сохраняется.</p></div>
          </details>
          <div class="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Категории достижений">
            <button v-for="item in tabs" :id="`xp-tab-${item.key}`" :key="item.key" type="button" role="tab" :aria-selected="tab === item.key" :tabindex="tab === item.key ? 0 : -1" @keydown.right.prevent="moveTab(1)" @keydown.left.prevent="moveTab(-1)" aria-controls="xp-panel" class="rounded-lg px-3 py-2 text-sm font-bold transition" :class="tab === item.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'" @click="tab = item.key">{{ item.label }}</button>
          </div>
          <div id="xp-panel" role="tabpanel" :aria-labelledby="`xp-tab-${tab}`" class="mt-4">
            <template v-if="tab !== 'history'">
              <div class="mb-3 flex flex-col gap-2 sm:flex-row">
                <input v-model="search" aria-label="Поиск достижения" placeholder="Найти достижение…" class="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" />
                <select v-model="status" aria-label="Статус достижения" class="rounded-lg border bg-white px-3 py-2 text-sm"><option value="all">Все достижения</option><option value="earned">Достигнуто</option><option value="locked">Впереди</option></select>
              </div>
              <div class="overflow-x-auto rounded-xl border border-slate-200">
                <table class="w-full min-w-[480px] text-sm">
                  <thead class="bg-slate-50 text-xs text-slate-500"><tr><th class="px-4 py-3 text-left">{{ tab === 'levels' ? 'Уровень' : 'Достижение' }}</th><th class="px-4 py-3 text-left">Условие</th><th class="px-4 py-3 text-left">Прогресс</th><th class="px-4 py-3 text-left">Статус</th></tr></thead>
                  <tbody class="divide-y divide-slate-100"><tr v-for="row in visibleRows" :key="row.id" :class="row.earned ? 'bg-blue-50/30' : ''"><td class="px-4 py-3 font-bold">{{ row.label }}</td><td class="px-4 py-3 text-slate-500">{{ row.condition }}</td><td class="px-4 py-3"><span v-if="row.target" class="whitespace-nowrap text-xs">{{ number(Math.min(row.current, row.target)) }} / {{ number(row.target) }} {{ row.unit }}</span><span v-else class="text-xs text-slate-500">Доступен сразу</span><span class="mt-1 block h-1.5 w-24 rounded-full bg-slate-100"><span class="block h-full rounded-full bg-blue-500" :style="{ width: `${row.target ? Math.min(100, row.current / row.target * 100) : 100}%` }"></span></span></td><td class="px-4 py-3"><span class="whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold" :class="row.earned ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'">{{ row.earned ? 'Достигнуто' : 'Впереди' }}</span></td></tr><tr v-if="!filteredRows.length"><td colspan="4" class="p-6 text-center text-slate-500">Подходящих достижений нет.</td></tr></tbody>
                </table>
              </div>
              <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{{ filteredRows.length }} достижений · {{ rowPage }} / {{ rowPages }}</span><div class="flex gap-2"><button type="button" :disabled="rowPage <= 1" class="rounded-lg border px-3 py-2 disabled:opacity-40" @click="rowPage--">Назад</button><button type="button" :disabled="rowPage >= rowPages" class="rounded-lg border px-3 py-2 disabled:opacity-40" @click="rowPage++">Далее</button></div></div>
              <button v-if="tab === 'levels'" type="button" class="mt-3 text-xs font-bold text-blue-700" @click="levelLimit = Math.max(levelLimit, level.level + 10) + 20">Показать ещё 20 уровней</button>
            </template>
            <template v-else>
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 class="font-bold">История получения опыта</h3><select v-model="historyKind" aria-label="Тип начисления" class="rounded-lg border bg-white px-3 py-2 text-sm"><option value="all">Все начисления</option><option value="watched">Просмотры · +30</option><option value="prediction">Верные прогнозы · +100</option><option value="fantasy">Фентези</option></select></div>
              <p v-if="historyQuery.isPending.value" class="py-6 text-center text-sm text-slate-500">Загружаем историю…</p>
              <p v-else-if="historyQuery.isError.value" role="alert" class="py-6 text-sm text-red-600">История недоступна. <button class="underline" @click="historyQuery.refetch()">Повторить</button></p>
              <div v-else class="divide-y divide-slate-100 rounded-xl border border-slate-200">
                <RouterLink v-for="event in historyQuery.data.value?.history ?? []" :key="event.id" :to="`/game/${event.game_id.replace('espn:', '')}`" class="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50" @click="open = false"><span class="min-w-14 rounded-lg bg-blue-50 px-2 py-2 text-center text-sm font-black text-blue-700">+{{ number(event.points) }}</span><span class="min-w-0 flex-1"><span class="block break-words text-sm font-bold">{{ experienceLabel(event) }}</span><span class="text-xs text-slate-500">{{ event.kind === 'watched' ? 'Просмотр матча' : event.kind === 'fantasy' ? 'Очки фентези' : 'Верный прогноз' }} · {{ date(event.created_at) }}</span></span><span aria-hidden="true" class="text-slate-400">↗</span></RouterLink>
                <p v-if="!historyQuery.data.value?.history.length" class="p-6 text-center text-sm text-slate-500">Пока нет начислений. Отметьте просмотренный матч или сделайте прогноз до его начала.</p>
              </div>
              <div v-if="(historyQuery.data.value?.historyTotal ?? 0) > 20" class="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500"><span>Страница {{ historyPage }} / {{ Math.ceil((historyQuery.data.value?.historyTotal ?? 0) / 20) }}</span><div class="flex gap-2"><button :disabled="historyPage <= 1" class="rounded-lg border px-3 py-2 disabled:opacity-40" @click="historyPage--">Назад</button><button :disabled="historyPage * 20 >= (historyQuery.data.value?.historyTotal ?? 0)" class="rounded-lg border px-3 py-2 disabled:opacity-40" @click="historyPage++">Далее</button></div></div>
            </template>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { authFetch } from '../../../api/authFetch'
import { experienceLabel, experienceLevel, xpForLevel, type ExperienceEvent } from '../../../utils/experience'
import type { ProfileProgressRule } from '../../../composables/NBA/PublicProfile/useProfileProgressRules'
const props = defineProps<{ profileId: string; watchedCount: number; topTeamCount: number; rules: ProfileProgressRule[] }>()
type Summary = { totalXp: number; watchedCount: number; correctPredictions: number; fantasyXp: number; fantasyGames: number; historyTotal: number; history: ExperienceEvent[] }
const number = (value: number) => value.toLocaleString('ru-RU')
const date = (value: string) => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
const open = ref(false), dialog = ref<HTMLElement | null>(null)
const tab = ref('levels'), search = ref(''), status = ref('all'), rowPage = ref(1), levelLimit = ref(40)
const historyKind = ref('all'), historyPage = ref(1)
const tabs = [{ key: 'levels', label: 'Уровни' }, { key: 'watched_games', label: 'Просмотры' }, { key: 'top_team', label: 'Команды' }, { key: 'predictions', label: 'Прогнозы' }, { key: 'history', label: 'История XP' }]
const summaryQuery = useQuery({
    queryKey: computed(() => ['profile-experience', props.profileId, props.watchedCount]),
    queryFn: ({ queryKey: [, id], signal }): Promise<Summary> => authFetch(`/api/profiles/${id}/experience`, { signal }),
    staleTime: 5000, refetchInterval: 30000
})
const summary = summaryQuery.data
const level = computed(() => experienceLevel(summary.value?.totalXp ?? 0))
const dialogHeading = computed(() => {
    if (tab.value === 'watched_games' || tab.value === 'top_team') {
        const count = tab.value === 'watched_games' ? props.watchedCount : props.topTeamCount
        const rank = props.rules.filter(rule => rule.category === tab.value && count >= rule.max_games).length + 1
        return { category: tab.value === 'watched_games' ? 'Достижения просмотров' : 'Достижения команды', title: `Уровень ${rank}`, description: tab.value === 'watched_games' ? `${number(count)} просмотренных матчей` : `${number(count)} матчей одной команды` }
    }
    return { category: 'Общий прогресс', title: `Уровень ${level.value.level}`, description: `${number(level.value.totalXp)} XP всего · ${number(level.value.remainingXp)} XP до следующего уровня` }
})
const historyQuery = useQuery({
    queryKey: computed(() => ['profile-experience-history', props.profileId, historyKind.value, historyPage.value]),
    enabled: computed(() => open.value && tab.value === 'history'),
    queryFn: ({ queryKey: [, id, kind, page], signal }): Promise<Summary> => authFetch(`/api/profiles/${id}/experience?offset=${(Number(page) - 1) * 20}${kind === 'all' ? '' : `&kind=${kind}`}`, { signal }),
    staleTime: 5000, refetchInterval: 30000
})
const rows = computed(() => {
    if (tab.value === 'levels') return Array.from({ length: Math.max(levelLimit.value, level.value.level + 10) }, (_, index) => {
        const n = index + 1, target = xpForLevel(n)
        return { id: `level-${n}`, label: `Уровень ${n}`, condition: `${number(target)} XP всего`, target, current: level.value.totalXp, unit: 'XP', earned: level.value.totalXp >= target }
    })
    if (tab.value === 'predictions') return [1, 5, 10, 25, 50, 100, 250, 500, 1000].map(target => ({ id: `prediction-${target}`, label: `${target} верных прогнозов`, condition: 'Угадать победителя матча', target, current: summary.value?.correctPredictions ?? 0, unit: 'прогнозов', earned: (summary.value?.correctPredictions ?? 0) >= target }))
    const current = tab.value === 'watched_games' ? props.watchedCount : props.topTeamCount
    const rules = props.rules.filter(rule => rule.category === tab.value).sort((a, b) => a.max_games - b.max_games)
    const milestones = rules.length ? [
        ...rules.map((rule, index) => ({ id: rule.id, target: index ? rules[index - 1]!.max_games : 0, label: `Уровень ${index + 1}${rule.title ? ` · ${rule.title}` : ''}` })),
        { id: `${tab.value}-last`, target: rules.at(-1)!.max_games, label: `Уровень ${rules.length + 1}` }
    ] : [1, 5, 10, 25, 50, 100, 250, 500, 1000].map(target => ({ id: `${tab.value}-${target}`, target, label: `${target} матчей` }))
    return milestones.map(item => ({ ...item, condition: item.target === 0 ? 'Доступен сразу' : tab.value === 'top_team' ? `Просмотреть ${item.target} матчей одной команды` : `Просмотреть ${item.target} матчей`, current, unit: 'матчей', earned: current >= item.target }))
})
const filteredRows = computed(() => rows.value.filter(row => (status.value === 'all' || row.earned === (status.value === 'earned')) && `${row.label} ${row.condition}`.toLowerCase().includes(search.value.trim().toLowerCase())))
const rowPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / 10)))
const visibleRows = computed(() => filteredRows.value.slice((rowPage.value - 1) * 10, rowPage.value * 10))
watch([tab, search, status], () => { rowPage.value = 1 })
watch(rowPages, pages => { rowPage.value = Math.min(rowPage.value, pages) })
watch(historyKind, () => { historyPage.value = 1 })
watch(() => props.profileId, () => { open.value = false; historyPage.value = 1; rowPage.value = 1; search.value = '' })
async function moveTab(direction: number) {
    const index = tabs.findIndex(item => item.key === tab.value)
    tab.value = tabs[(index + direction + tabs.length) % tabs.length]!.key
    await nextTick(); document.getElementById(`xp-tab-${tab.value}`)?.focus()
}
function openCategory(category: 'levels' | 'watched_games' | 'top_team' | 'predictions' | 'history') {
    tab.value = category
    search.value = ''; status.value = 'all'; rowPage.value = 1
    open.value = true
}
defineExpose({ openCategory })
let previousFocus: HTMLElement | null = null
let previousOverflow = ''
function trapFocus(event: KeyboardEvent) {
    if (!open.value || event.key !== 'Tab' || !dialog.value) return
    const items = [...dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, summary')]
    const first = items[0], last = items.at(-1)
    if (!first || !last) return
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
watch(open, async value => {
    if (value) {
        previousFocus = document.activeElement as HTMLElement
        previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        document.addEventListener('keydown', trapFocus)
        await nextTick(); dialog.value?.focus()
        void summaryQuery.refetch()
    } else {
        document.removeEventListener('keydown', trapFocus)
        document.body.style.overflow = previousOverflow
        previousFocus?.focus()
    }
})
onBeforeUnmount(() => {
    document.removeEventListener('keydown', trapFocus)
    if (open.value) document.body.style.overflow = previousOverflow
})
</script>
