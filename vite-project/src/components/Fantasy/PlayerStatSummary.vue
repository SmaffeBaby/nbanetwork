<template>
  <div class="space-y-5">
    <template v-if="data.stats.gamesPlayed">
      <div>
        <h3 class="font-extrabold text-slate-900">В среднем за матч</h3>
        <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div v-for="[label,key] in metrics" :key="key" class="rounded-xl bg-slate-50 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2"><p class="text-xl font-black text-slate-900">{{ statValue(key) }}</p><span v-if="data.ranks" class="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700" :title="rankTitle(key)">{{ rankText(key) }}</span></div>
            <p class="mt-1 text-xs text-slate-500">{{ label }}</p>
          </div>
        </div>
      </div>
      <div>
        <h3 class="font-extrabold text-slate-900">Броски</h3>
        <div class="mt-3 grid gap-3 sm:grid-cols-3">
          <div v-for="shot in shooting" :key="shot.pct" class="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/60 to-white p-4">
            <p class="text-xs font-bold text-slate-600">{{ shot.label }}</p>
            <div class="mt-2 flex flex-wrap items-center justify-between gap-2"><p class="text-2xl font-black text-slate-900">{{ statValue(shot.pct, true) }}</p><span v-if="data.ranks" class="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700" :title="rankTitle(shot.pct)">{{ rankText(shot.pct) }}</span></div>
            <p class="mt-1 text-[11px] text-slate-400">Точность</p>
            <div class="mt-3 space-y-2 border-t border-blue-100 pt-3 text-xs"><div v-for="[label,key] in [['Попадания',shot.made],['Попытки',shot.attempts]]" :key="key" class="flex flex-wrap items-center justify-between gap-1"><span class="text-slate-500">{{ label }} / матч</span><span class="font-bold text-slate-900">{{ statValue(key!) }} <span v-if="data.ranks" class="ml-1 font-medium text-blue-600" :title="rankTitle(key!)">{{ rankText(key!) }}</span></span></div></div>
          </div>
        </div>
        <p v-if="data.ranks" class="mt-3 text-[11px] leading-5 text-slate-500">Место среди игроков НБА с хотя бы одним матчем в регулярном сезоне. Больше значение — выше место, включая потери. Равные значения делят место. Для точности бросков учитываются только игроки с попытками соответствующего типа. Без минимальной квалификации НБА.</p>
        <p v-if="data.rankingsUpdating" role="status" class="mt-1 text-[11px] text-blue-600">Обновляем сезонные места по подборам в нападении и защите…</p>
        <p v-else-if="data.ranks && !data.reboundsRankedAt" class="mt-1 text-[11px] text-slate-400">Места по подборам в нападении и защите временно недоступны.</p>
        <p v-if="data.reboundsRankedAt" class="mt-1 text-[11px] text-slate-400">Места по подборам обновлены {{ dateTime(data.reboundsRankedAt) }} МСК. Сезонные данные кешируются до 15 минут.</p>
      </div>
      <FantasyRadar :stats="data.stats" :label="radarLabel" />
    </template>
    <p v-else class="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Пока нет сыгранных матчей или опубликованной статистики.</p>
  </div>
</template>

<script setup lang="ts">
import { dateTime, points, type PlayerStatData } from './types'
import FantasyRadar from './FantasyRadar.vue'
const props = defineProps<{ data: PlayerStatData; radarLabel?: string }>()
const metrics = [['Очки','avgPoints'],['Подборы всего','avgRebounds'],['Подборы в нападении','avgOffensiveRebounds'],['Подборы в защите','avgDefensiveRebounds'],['Передачи','avgAssists'],['Перехваты','avgSteals'],['Блоки','avgBlocks'],['Потери','avgTurnovers'],['Минуты','avgMinutes']] as const
const shooting = [
  { label:'Двухочковые', pct:'twoPointPct', made:'avgTwoPointFieldGoalsMade', attempts:'avgTwoPointFieldGoalsAttempted' },
  { label:'Трёхочковые', pct:'threePointFieldGoalPct', made:'avgThreePointFieldGoalsMade', attempts:'avgThreePointFieldGoalsAttempted' },
  { label:'Штрафные', pct:'freeThrowPct', made:'avgFreeThrowsMade', attempts:'avgFreeThrowsAttempted' }
]
function statValue(key: string, percent = false) {
  const attemptKey = shooting.find(s=>s.pct===key)?.attempts
  if (props.data?.stats[key] == null || (percent && attemptKey && !(props.data.stats[attemptKey]! > 0))) return '—'
  return `${points(props.data.stats[key]!)}${percent ? '%' : ''}`
}
function rankText(key: string) {
  const rank=props.data?.ranks?.[key]
  return rank ? `#${rank.place} из ${rank.total}` : 'Место —'
}
function rankTitle(key: string) {
  const rank=props.data?.ranks?.[key]
  return rank ? `${rank.place}-е место среди ${rank.total} игроков сезона` : 'Недостаточно данных для сезонного места'
}
</script>
