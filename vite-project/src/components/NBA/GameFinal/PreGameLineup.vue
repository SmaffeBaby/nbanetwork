<template>
 <section class="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
  <RouterLink :to="`/team/${team.abbr}`" class="flex items-center gap-3"><img :src="getTeamLogo(team.abbr)" alt="" class="h-12 w-12 object-contain"><div><h2 class="text-lg font-black text-gray-900 dark:text-white">{{ team.name }}</h2><p class="text-xs text-gray-500">{{ team.record || '—' }} · {{ team.side==='away'?'В гостях':'Дома' }}</p></div></RouterLink>
  <p class="mb-4 mt-5 text-xs font-bold uppercase tracking-wide text-gray-500">{{ team.lineup.kind==='confirmed'?'Стартовая пятёрка подтверждена':'Предполагаемая пятёрка' }}</p>
  <div v-for="player in team.lineup.players" :key="player.id || player.position" class="flex min-h-14 items-center gap-3 border-t border-gray-50 py-2 dark:border-slate-800">
   <span class="w-6 text-xs font-black text-gray-400">{{ player.position }}</span>
   <img v-if="player.image" :src="player.image" alt="" class="h-10 w-10 rounded-full bg-gray-50 object-cover dark:bg-slate-800" @error="hideImage">
   <div class="min-w-0"><RouterLink v-if="player.id" :to="`/player/${encodeURIComponent(player.name)}`" class="text-sm font-bold text-gray-800 hover:text-blue-600 dark:text-slate-200">{{ player.name }}</RouterLink><span v-else class="text-sm text-gray-400">{{ player.name }}</span><p v-if="player.status" class="text-xs text-amber-600">{{ statusLabel(player.status) }}</p></div>
  </div>
 </section>
</template>
<script setup lang="ts">
import {getTeamLogo} from '../../../utils/getTeamLogo'
import {statusLabel} from '../../../composables/NBA/GameFinal/previewLabels'
defineProps<{team:any}>()
const hideImage=(event:Event)=>{(event.target as HTMLImageElement).style.display='none'}
</script>
