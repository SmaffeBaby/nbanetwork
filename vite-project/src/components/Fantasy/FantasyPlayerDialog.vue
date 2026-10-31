<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" @click.self="$emit('close')" @keydown.esc.stop="$emit('close')">
      <section ref="dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1" class="max-h-[92svh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl focus:outline-none">
        <header class="relative overflow-hidden bg-gradient-to-br from-slate-950 to-blue-950 p-5 text-white sm:p-7">
          <button type="button" aria-label="Закрыть карточку игрока" class="absolute right-4 top-4 z-10 rounded-full bg-white/15 px-3 py-1 text-2xl hover:bg-white/25" @click="$emit('close')">×</button>
          <div class="flex items-center gap-4 pr-9">
            <div class="flex h-28 w-28 shrink-0 items-end overflow-hidden rounded-2xl bg-white/10 sm:h-36 sm:w-36"><img v-if="!photoFailed" :src="`https://a.espncdn.com/i/headshots/nba/players/full/${player.id}.png`" :alt="player.name" class="h-full w-full object-contain object-bottom" @error="photoFailed = true" /><span v-else class="m-auto text-3xl font-black">{{ player.name.split(' ').map(p=>p[0]).slice(0,2).join('') }}</span></div>
            <div class="min-w-0"><p class="flex items-center gap-2 text-xs font-bold text-blue-200"><img :src="`/logos/${player.team}.svg`" :alt="player.team" class="h-7 w-7 object-contain" />{{ player.team }} · {{ position }}</p><h2 :id="titleId" class="mt-2 break-words text-2xl font-black sm:text-3xl">{{ player.name }}</h2><p class="mt-2 text-sm text-blue-200">Сезон {{ data?.season || 'НБА' }} · {{ data ? `Матчей сыграно: ${data.gamesPlayed}` : 'Загружаем статистику' }}<span v-if="data?.ranks.gamesPlayed" class="ml-2 text-xs">{{ rankText('gamesPlayed') }}</span></p></div>
          </div>
          <div class="mt-4 flex flex-wrap items-center gap-3">
          <FantasyOvrBadge v-if="data?.rating || player.ovr" :rating="data?.rating || player" :name="player.name" />
          <RouterLink :to="`/player/${encodeURIComponent(player.name)}`" class="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-900" @click="$emit('close')">Страница игрока ↗</RouterLink>
          </div>
        </header>
        <div class="sticky top-0 z-20 border-b border-slate-100 bg-white p-3 sm:px-7">
          <FantasyPlayerTabs v-model="activeTab" :tabs="tabs" :id="titleId" label="Разделы карточки игрока" />
        </div>
        <div class="space-y-5 p-5 sm:p-7">
          <p v-if="'injury' in player && player.injury" class="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">Травма / ограничение · {{ player.injury }}</p>
          <p v-if="loading" role="status" class="py-10 text-center text-slate-500">Загружаем статистику сезона…</p>
          <p v-else-if="error" role="alert" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{{ error }} <button class="font-bold underline" @click="load">Повторить</button></p>

          <div v-show="activeTab==='fantasy'" :id="`${titleId}-panel-fantasy`" role="tabpanel" :aria-labelledby="`${titleId}-tab-fantasy`" class="space-y-5">
          <section v-if="data" class="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <FantasySectionHeading title="Баллы фентези">
              <template #value><span class="text-2xl font-black text-blue-700">{{ points(data.fantasy.points) }}</span></template>
              <p>{{ data.fantasy.profile ? 'Баллы в составе этого профиля за выбранный турнир: учитываются матчи после закрепления состава.' : 'Учтённые матчи выбранного турнира. В составе профиля учитываются только игры после его закрепления.' }}</p>
              <p>Откройте матч ниже, чтобы увидеть начисления за статистику, бонусы и штрафы. Бонусы за дабл-дабл и трипл-дабл не складываются.</p>
            </FantasySectionHeading>

            <details v-for="game in data.fantasy.games" :key="game.id" class="mt-3 rounded-xl border border-blue-100 bg-white p-3">
              <summary class="cursor-pointer text-sm font-bold text-slate-800">{{ game.matchup }} · {{ points(game.points) }} баллов <span class="block text-xs font-normal text-slate-500">{{ dateTime(game.start) }} МСК</span></summary>
              <div class="mt-3 divide-y divide-slate-100"><div v-for="item in game.breakdown" :key="item.key" class="flex items-center justify-between gap-3 py-2 text-xs"><span class="text-slate-600">{{ item.label }} <span class="text-slate-400">{{ item.count }} × {{ points(item.weight) }}</span></span><strong :class="item.points < 0 ? 'text-rose-600' : 'text-blue-700'">{{ item.points > 0 ? '+' : '' }}{{ points(item.points) }}</strong></div></div>
              <RouterLink :to="`/game/${game.id}`" class="mt-3 inline-block text-xs font-bold text-blue-700" @click="$emit('close')">Открыть матч ↗</RouterLink>
            </details>
            <div v-if="data.fantasy.profile" class="mt-3 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-800">
              <p class="flex justify-between gap-3"><span>Базовые баллы</span><strong>{{ points(data.fantasy.basePoints) }}</strong></p>
              <p class="mt-2 flex justify-between gap-3"><span>Бонус уровня {{ data.fantasy.bonusLevel }} · +{{ points(data.fantasy.bonusRate * 100) }}%</span><strong>+{{ points(data.fantasy.bonusPoints) }}</strong></p>
            </div>
            <p v-if="!data.fantasy.games.length" class="mt-3 text-sm text-slate-500">Начислений за этот турнир пока нет. Баллы появятся после обработки завершённых матчей.</p>
          </section>
          <section v-if="data && playerXp !== undefined">
            <FantasySectionHeading title="Уровень фентези" class="mb-3">
              <p>1 балл = 1 XP. Опыт — сумма положительных базовых результатов турниров игрока в этом профиле. Он сохраняется между игровыми днями, даже если игрока нет в новом составе. Смена позиции не сбрасывает опыт.</p>
              <p>Порог уровня N: 150 × N × (N − 1) XP. Уровень 2 — 300 XP, уровень 3 — 900 XP. Бонусы к положительным баллам за турнир: с уровня 3 — +0,5%, с 5 — +1%, с 8 — +1,5%, с 10 — +2%. Максимум +3 балла на игрока за турнир. Уровень и процент фиксируются при закреплении состава, бонус в XP не входит.</p>
            </FantasySectionHeading>
            <FantasyPlayerLevel :xp="playerXp" />
          </section>
          </div>
          <div v-show="activeTab==='stats'" :id="`${titleId}-panel-stats`" role="tabpanel" :aria-labelledby="`${titleId}-tab-stats`" class="space-y-5">
          <template v-if="data?.gamesPlayed">
            <div>
              <h3 class="font-extrabold text-slate-900">В среднем за матч</h3>
              <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div v-for="[label,key] in metrics" :key="key" class="rounded-xl bg-slate-50 p-3">
                  <div class="flex flex-wrap items-center justify-between gap-2"><p class="text-xl font-black text-slate-900">{{ statValue(key) }}</p><span class="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700" :title="rankTitle(key)">{{ rankText(key) }}</span></div>
                  <p class="mt-1 text-xs text-slate-500">{{ label }}</p>
                </div>
              </div>
            </div>
            <div>
              <h3 class="font-extrabold text-slate-900">Броски</h3>
              <div class="mt-3 grid gap-3 sm:grid-cols-3">
                <div v-for="shot in shooting" :key="shot.pct" class="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/60 to-white p-4">
                  <p class="text-xs font-bold text-slate-600">{{ shot.label }}</p>
                  <div class="mt-2 flex flex-wrap items-center justify-between gap-2"><p class="text-2xl font-black text-slate-900">{{ statValue(shot.pct, true) }}</p><span class="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700" :title="rankTitle(shot.pct)">{{ rankText(shot.pct) }}</span></div>
                  <p class="mt-1 text-[11px] text-slate-400">Точность за сезон</p>
                  <div class="mt-3 space-y-2 border-t border-blue-100 pt-3 text-xs"><div v-for="[label,key] in [['Попадания',shot.made],['Попытки',shot.attempts]]" :key="key" class="flex flex-wrap items-center justify-between gap-1"><span class="text-slate-500">{{ label }} / матч</span><span class="font-bold text-slate-900">{{ statValue(key!) }} <span class="ml-1 font-medium text-blue-600" :title="rankTitle(key!)">{{ rankText(key!) }}</span></span></div></div>
                </div>
              </div>
              <p class="mt-3 text-[11px] leading-5 text-slate-500">Место среди игроков НБА с хотя бы одним матчем в регулярном сезоне. Больше значение — выше место, включая потери. Равные значения делят место. Для точности бросков учитываются только игроки с попытками соответствующего типа. Без минимальной квалификации НБА.</p>
              <p v-if="data.rankingsUpdating" role="status" class="mt-1 text-[11px] text-blue-600">Обновляем сезонные места по подборам в нападении и защите…</p>
              <p v-else-if="!data.reboundsRankedAt" class="mt-1 text-[11px] text-slate-400">Места по подборам в нападении и защите временно недоступны.</p>
              <p v-if="data.reboundsRankedAt" class="mt-1 text-[11px] text-slate-400">Места по подборам обновлены {{ dateTime(data.reboundsRankedAt) }} МСК. Сезонные данные кешируются до 15 минут.</p>
            </div>
            <FantasyRadar :stats="data.stats" />
          </template>
          <p v-else-if="data" class="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">В текущем регулярном сезоне ещё нет сыгранных матчей или опубликованной статистики. График появится после первой игры.</p>
          </div>
          <div v-show="activeTab==='rating'" :id="`${titleId}-panel-rating`" role="tabpanel" :aria-labelledby="`${titleId}-tab-rating`">
            <FantasyRatingHistory v-if="activeTab==='rating'" :player-id="player.id" :season="seasonYear" :slate-ovr="data?.rating?.ovr || player.ovr" />
          </div>
          <div v-show="activeTab==='games'" :id="`${titleId}-panel-games`" role="tabpanel" :aria-labelledby="`${titleId}-tab-games`">
            <h3 class="font-extrabold text-slate-900">Матчи игрового дня</h3>
            <div v-if="games.length" class="mt-3 grid gap-3 sm:grid-cols-2">
              <RouterLink v-for="game in games" :key="game.id" :to="`/game/${game.id}`" class="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/40" @click="$emit('close')">
                <div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide"><span :class="game.completed ? 'text-slate-400' : 'text-blue-600'">{{ game.completed ? 'Завершён' : Date.parse(game.start) <= Date.now() ? 'Начался' : 'Скоро' }}</span><span class="text-slate-400">↗</span></div>
                <div class="my-4 flex items-center justify-center gap-4"><template v-for="(team,index) in game.teams || fallbackTeams(game)" :key="team.abbr"><span v-if="index" class="text-xs font-black text-slate-300">VS</span><div class="text-center"><img :src="`/logos/${team.abbr}.svg`" :alt="team.abbr" class="mx-auto h-12 w-12 object-contain" /><p class="mt-2 text-sm font-extrabold text-slate-800">{{ team.abbr }}</p></div></template></div>
                <p class="text-center text-xs font-semibold text-slate-500">{{ dateTime(game.start) }} МСК</p>
              </RouterLink>
            </div>
            <p v-else class="mt-3 text-sm text-slate-500">Матчей в этот день нет.</p>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId } from 'vue'
import { authFetch } from '../../api/authFetch'
import { dateTime, points, type Match, type Player, type Pick, type PlayerDetails } from './types'
import FantasySectionHeading from './FantasySectionHeading.vue'
import FantasyPlayerLevel from './FantasyPlayerLevel.vue'
import FantasyRadar from './FantasyRadar.vue'
import FantasyOvrBadge from './FantasyOvrBadge.vue'
import FantasyPlayerTabs from './FantasyPlayerTabs.vue'
import FantasyRatingHistory from './FantasyRatingHistory.vue'
const props = defineProps<{ player: Player | Pick; position: string; week?: string; mode?: 'unlimited' | 'balanced' | 'legacy'; profileId?: string; playerXp?: number }>()
defineEmits<{ close: [] }>()
const titleId = useId(), dialog = ref<HTMLElement | null>(null), data = ref<PlayerDetails | null>(null), loading = ref(true), error = ref(''), photoFailed = ref(false)
const activeTab=ref('fantasy')
const tabs=[{id:'fantasy',label:'Фентези'},{id:'stats',label:'Статистика'},{id:'rating',label:'Рейтинг OVR'},{id:'games',label:'Матчи'}]
const seasonYear=computed(()=>{const date=new Date(`${props.week || new Date(Date.now()+3*3600000).toISOString().slice(0,10)}T12:00:00Z`);return date.getUTCFullYear()+(date.getUTCMonth()>=6?1:0)})
const metrics = [['Очки','avgPoints'],['Подборы всего','avgRebounds'],['Подборы в нападении','avgOffensiveRebounds'],['Подборы в защите','avgDefensiveRebounds'],['Передачи','avgAssists'],['Перехваты','avgSteals'],['Блоки','avgBlocks'],['Потери','avgTurnovers'],['Минуты','avgMinutes']] as const
const shooting = [
  { label:'Двухочковые', pct:'twoPointPct', made:'avgTwoPointFieldGoalsMade', attempts:'avgTwoPointFieldGoalsAttempted' },
  { label:'Трёхочковые', pct:'threePointFieldGoalPct', made:'avgThreePointFieldGoalsMade', attempts:'avgThreePointFieldGoalsAttempted' },
  { label:'Штрафные', pct:'freeThrowPct', made:'avgFreeThrowsMade', attempts:'avgFreeThrowsAttempted' }
]
function statValue(key: string, percent = false) {
  const attemptKey = shooting.find(s=>s.pct===key)?.attempts
  if (data.value?.stats[key] == null || (percent && attemptKey && !(data.value.stats[attemptKey]! > 0))) return '—'
  return `${points(data.value.stats[key]!)}${percent ? '%' : ''}`
}
function rankText(key: string) {
  const rank=data.value?.ranks[key]
  return rank ? `#${rank.place} из ${rank.total}` : 'Место —'
}
function rankTitle(key: string) {
  const rank=data.value?.ranks[key]
  return rank ? `${rank.place}-е место среди ${rank.total} игроков сезона` : 'Недостаточно данных для сезонного места'
}
const games = computed(() => data.value?.schedule.length ? data.value.schedule : 'schedule' in props.player ? props.player.schedule : [])
const fallbackTeams = (game: Match) => game.matchup.split(' — ').map(abbr=>({abbr}))
const controller = new AbortController()
let rankPoll: ReturnType<typeof setTimeout> | undefined
async function load() {
  clearTimeout(rankPoll)
  if (!data.value) loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams()
    if (props.week) params.set(props.mode === 'legacy' ? 'week' : 'day', props.week)
    if (props.mode && props.mode !== 'legacy') params.set('mode', props.mode)
    if (props.profileId) params.set('profile', props.profileId)
    data.value = await authFetch(`/api/fantasy/players/${props.player.id}?${params}`, { signal:controller.signal })
    if (data.value?.rankingsUpdating && !controller.signal.aborted) rankPoll = setTimeout(() => void load(), 10000)
  }
  catch (e:any) { if (!controller.signal.aborted) error.value = e.message }
  finally { loading.value = false }
}
let previousFocus: HTMLElement | null = null, previousOverflow = ''
function trap(event: KeyboardEvent) {
  if(event.key !== 'Tab' || !dialog.value || !(event.target instanceof Node) || !dialog.value.contains(event.target)) return
  const items = [...dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],summary')].filter(e=>e.getClientRects().length>0), first=items[0], last=items.at(-1)
  if(event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last?.focus() }
  else if(!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
onMounted(async () => { previousFocus=document.activeElement as HTMLElement; previousOverflow=document.body.style.overflow; document.body.style.overflow='hidden'; document.addEventListener('keydown',trap); await nextTick();dialog.value?.focus();void load() })
onUnmounted(() => { clearTimeout(rankPoll); controller.abort(); document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',trap);previousFocus?.focus() })
</script>
