<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-xl font-black text-slate-900">Сравнение игроков</h2>
      <p class="mt-1 text-sm text-slate-500">Текущий регулярный сезон. По умолчанию выбраны три других игрока той же позиции по OVR.</p>
    </div>
    <div v-if="data.player" class="space-y-4">
      <label class="block text-sm font-bold text-slate-700">Найти соперника
        <input v-model="query" type="search" placeholder="Имя игрока или команда" class="mt-1 block w-full rounded-xl border border-slate-300 p-2.5 font-normal" />
      </label>
      <ul v-if="query.trim()" class="divide-y divide-slate-100 rounded-xl border border-slate-200">
        <li v-for="candidate in matches" :key="candidate.id">
          <button type="button" class="flex w-full justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50 disabled:text-slate-400" :disabled="selected.some(p => p.id===candidate.id) || selected.length>=3" @click="add(candidate)">
            <span>{{ candidate.name }} · {{ candidate.team }}</span><span>{{ candidate.ovr }} OVR</span>
          </button>
        </li>
        <li v-if="!matches.length" class="p-3 text-sm text-slate-500">Игроки не найдены.</li>
      </ul>
      <div class="flex flex-wrap items-center gap-2">
        <button v-for="peer in selected" :key="peer.id" type="button" class="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700" :aria-label="`Убрать ${peer.name} из сравнения`" @click="selected=selected.filter(p => p.id!==peer.id)">{{ peer.name }} ×</button>
        <button type="button" class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600" @click="selected=[...data.peers]">Вернуть тройку по OVR</button>
      </div>
      <p class="text-xs text-slate-500">Одновременно можно сравнить до трёх соперников. При равном OVR выше игрок с большим средним числом очков.</p>
      <div class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="w-full min-w-[30rem] text-left text-sm">
          <thead class="bg-slate-100"><tr><th scope="col" class="p-3">За матч</th><th scope="col" class="p-3 text-blue-700">{{ data.player.name }}</th><th v-for="peer in selected" :key="peer.id" scope="col" class="p-3">{{ peer.name }}</th></tr></thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="[label,key,percent] in metrics" :key="key">
              <th scope="row" class="p-3 font-semibold text-slate-700">{{ label }}</th>
              <td v-for="(player,i) in [data.player,...selected]" :key="i" class="p-3 tabular-nums">{{ format(player.stats[key],percent) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p v-else class="text-sm text-slate-500">У игрока нет данных текущего регулярного сезона.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { points } from '../../../Fantasy/types'
import type { ComparePlayer, ProfileCurrent } from './playerProfileData'

const props = defineProps<{ data: ProfileCurrent }>()
const selected = ref([...props.data.peers])
const query = ref('')
const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()
const matches = computed(() => (props.data.candidates || []).filter(p => normalize(`${p.name} ${p.team}`).includes(normalize(query.value.trim()))).slice(0,8))
const metrics = [
  ['Матчи','gamesPlayed',false],['Очки','avgPoints',false],['Подборы','avgRebounds',false],['Передачи','avgAssists',false],
  ['Перехваты','avgSteals',false],['Блоки','avgBlocks',false],['Потери','avgTurnovers',false],['Минуты','avgMinutes',false],
  ['Двухочковые','twoPointPct',true],['Трёхочковые','threePointFieldGoalPct',true],['Штрафные','freeThrowPct',true]
] as const
function format(value: number | undefined, percent: boolean) {
  return value == null ? '—' : `${points(value)}${percent?'%':''}`
}
function add(candidate: ComparePlayer) {
  selected.value = [...selected.value,candidate]
  query.value = ''
}
</script>
