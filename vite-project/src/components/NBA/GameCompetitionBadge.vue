<template>
  <div v-if="competition" class="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-bold leading-4">
    <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ring-inset" :class="colors"><TrophyIcon v-if="competition.kind==='cup'" class="h-3.5 w-3.5 shrink-0"/>{{ competition.label }}<span v-if="competition.stageLabel" class="opacity-75">· {{ competition.stageLabel }}</span></span>
    <span v-if="competition.kind==='cup'&&competition.regularSeason!==null" class="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">{{ competition.regularSeason ? 'Также регулярный сезон' : 'Вне зачёта регулярного сезона' }}</span>
  </div>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import {TrophyIcon} from '@heroicons/vue/24/solid'
import type {GameCompetition} from '../../types/gameCompetition'
const props=defineProps<{competition?:GameCompetition|null}>()
const colors=computed(()=>({cup:'bg-amber-50 text-amber-800 ring-amber-200',playoffs:'bg-orange-50 text-orange-700 ring-orange-200','play-in':'bg-violet-50 text-violet-700 ring-violet-200',preseason:'bg-teal-50 text-teal-700 ring-teal-200',regular:'bg-blue-50 text-blue-700 ring-blue-200'}[props.competition?.kind||'regular']))
</script>
