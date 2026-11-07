<template>
  <section class="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5" aria-label="Тренер и руководство команды">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 class="font-extrabold text-slate-900">Тренер и руководство</h2><span class="text-xs text-slate-400">{{ season }}</span></div>
    <p v-if="query.isPending.value" role="status" class="text-sm text-slate-500">Загружаем состав штаба…</p>
    <p v-else-if="query.error.value" class="text-sm text-slate-500">{{ query.error.value.message }} <button class="font-bold text-blue-600" @click="query.refetch()">Повторить</button></p>
    <div v-else-if="query.data.value?.staff.length" class="grid gap-3 sm:grid-cols-2">
      <RouterLink v-for="person in query.data.value.staff" :key="`${person.role}:${person.id}`" :to="staffLocation(person.role,person.id,season)" class="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/40">
        <StaffPhoto :role="person.role" :id="person.id" :period="season" />
        <span class="min-w-0"><span class="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{{ person.role==='coach'?'Главный тренер':'Руководитель клуба' }}</span><span class="mt-1 block font-extrabold text-slate-800">{{ person.name }} <span class="text-blue-600">↗</span></span><span v-if="person.wins!=null && person.losses!=null" class="mt-1 block text-xs text-slate-500">Баланс в сезоне: {{ person.wins }}–{{ person.losses }}</span></span>
      </RouterLink>
    </div>
    <p v-else class="text-sm text-slate-500">В архиве пока нет данных о штабе этого сезона.</p>
    <p v-if="(query.data.value?.staff.filter(p=>p.role==='coach').length || 0)>1" class="mt-3 text-xs text-slate-400">В сезоне командой руководили несколько тренеров. Показаны все, указанные в архиве.</p>
  </section>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import {useQuery} from '@tanstack/vue-query'
import {staffLocation,type TeamStaff} from '../../../types/staff'
import StaffPhoto from './StaffPhoto.vue'
const props=defineProps<{teamAbbr:string;season:string}>()
const query=useQuery({queryKey:computed(()=>['team-staff',props.teamAbbr,props.season]),queryFn:async({signal,queryKey})=>{
  const response=await fetch(`/api/team-staff/${queryKey[1]}/${queryKey[2]}`,{signal:AbortSignal.any([signal,AbortSignal.timeout(22000)])})
  const data=await response.json()
  if(!response.ok)throw new Error(data.error || 'Штаб временно недоступен')
  return data as TeamStaff
},staleTime:3600000,retry:1})
</script>
