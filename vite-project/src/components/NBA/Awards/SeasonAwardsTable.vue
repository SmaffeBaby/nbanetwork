<template>
  <div class="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
    <table class="w-full min-w-[580px] text-left text-sm">
      <caption class="sr-only">{{ title }} · {{ season }}</caption>
      <thead class="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr>
        <th v-if="periodic" scope="col" class="px-5 py-4">{{ category==='week'?'Дата награждения':'Месяц' }}</th>
        <th v-if="!periodic" scope="col" class="px-5 py-4">{{ rows.some(r=>r.selection)?'Сборная':'Награда' }}</th>
        <th v-if="periodic" scope="col" class="px-4 py-4">Конференция</th>
        <th scope="col" class="px-5 py-4">{{ category==='coach-month'?'Тренер':'Обладатель' }}</th>
        <th v-if="hasTeams" scope="col" class="px-5 py-4">Команда</th>
      </tr></thead>
      <tbody class="divide-y divide-slate-100"><tr v-for="row in rows" :key="row.id" class="hover:bg-blue-50/40">
        <td class="px-5 py-4 font-bold text-slate-700">{{ periodic ? period(row) : row.selection ? `${row.selection}-я сборная` : row.award }}</td>
        <td v-if="periodic" class="px-4 py-4 text-xs text-slate-500"><span class="inline-block rounded-lg px-2 py-1" :class="row.conference==='east'?'bg-blue-50 text-blue-700':row.conference==='west'?'bg-rose-50 text-rose-700':'bg-slate-50'">{{ row.conference==='east'?'Восток':row.conference==='west'?'Запад':'Вся лига' }}</span></td>
        <td class="px-5 py-4"><SeasonAwardRecipient :person="row.recipient" /></td>
        <td v-if="hasTeams" class="px-5 py-4"><SeasonAwardRecipient v-if="row.team && row.recipient.kind!=='team'" :person="row.team" /><span v-else class="text-slate-400">—</span></td>
      </tr></tbody>
    </table>
  </div>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import type {SeasonAwardRow} from '../../../types/seasonAwards'
import SeasonAwardRecipient from './SeasonAwardRecipient.vue'
const props=defineProps<{rows:SeasonAwardRow[];category:string;season:string;title:string}>()
const periodic=computed(()=>['week','month','rookie-month','defense-month','coach-month'].includes(props.category))
const hasTeams=computed(()=>props.rows.some(row=>row.team && row.recipient.kind!=='team'))
const period=(row:SeasonAwardRow)=>props.category==='week'&&row.period?new Intl.DateTimeFormat('ru-RU',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'}).format(new Date(`${row.period}T12:00:00Z`)):row.periodLabel || '—'
</script>
