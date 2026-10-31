<template>
  <section v-if="liveGames.length" :aria-labelledby="titleId">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h2 :id="titleId" class="m-0 text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">Матчи онлайн</h2>
      <span class="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200"><span aria-hidden="true" class="h-2 w-2 rounded-full bg-rose-500 motion-safe:animate-pulse"/>В игре · {{ liveGames.length }}</span>
    </div>
    <p v-if="error" role="alert" class="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Не удалось обновить онлайн-матчи. <button class="font-bold underline" @click="retry">Повторить</button></p>
    <div class="grid gap-4" :class="liveGames.length===1?'max-w-xl grid-cols-1':'md:grid-cols-2 xl:grid-cols-3'">
      <RouterLink v-for="game in liveGames" :key="game.id" :to="gameLocation(game)" :aria-label="`Открыть матч ${game.visitor_team.full_name} — ${game.home_team.full_name}`" class="group relative overflow-hidden rounded-3xl border border-rose-200 bg-gradient-to-br from-white via-white to-rose-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500 sm:p-6">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2"><span class="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1 text-[10px] font-black tracking-wider text-white"><span aria-hidden="true" class="h-1.5 w-1.5 rounded-full bg-white motion-safe:animate-pulse"/>LIVE</span><span class="rounded-full bg-white px-3 py-1 text-xs font-bold tabular-nums text-slate-600 ring-1 ring-slate-100">{{ periodLabel(game) }}<span v-if="game.livePeriod&&game.clock" class="ml-2 text-rose-600">{{ game.clock }}</span></span></div>
        <GameCompetitionBadge :competition="game.competition" class="mb-5"/>
        <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div class="min-w-0 text-center"><img :src="getTeamLogo(game.visitor_team.abbreviation)" alt="" class="mx-auto h-14 w-14 object-contain sm:h-16 sm:w-16"/><p class="mt-3 text-xs font-bold leading-5 text-slate-700">{{ game.visitor_team.full_name }}</p></div>
          <div class="text-center"><p class="whitespace-nowrap text-2xl font-black tabular-nums text-slate-950 sm:text-3xl">{{ hideScores?'—':game.visitor_team_score??'—' }}<span class="mx-1 text-slate-300">:</span>{{ hideScores?'—':game.home_team_score??'—' }}</p><span v-if="hideScores" class="mt-1 block text-[10px] text-slate-400">Счёт скрыт</span></div>
          <div class="min-w-0 text-center"><img :src="getTeamLogo(game.home_team.abbreviation)" alt="" class="mx-auto h-14 w-14 object-contain sm:h-16 sm:w-16"/><p class="mt-3 text-xs font-bold leading-5 text-slate-700">{{ game.home_team.full_name }}</p></div>
        </div>
        <div class="mt-5 flex items-center justify-between border-t border-rose-100 pt-4 text-xs"><span class="text-slate-400">Идёт сейчас</span><span class="font-bold text-rose-600 group-hover:underline">Открыть матч ↗</span></div>
      </RouterLink>
    </div>
  </section>
</template>
<script setup lang="ts">
import {computed,useId} from 'vue'
import {useDailyGames,type Game} from '../../../composables/NBA/main_slider/useDailyGames'
import {useAuthStore} from '../../../stores/auth'
import {gameLocation} from '../../../api/gameNavigation'
import {getTeamLogo} from '../../../utils/getTeamLogo'
import GameCompetitionBadge from '../GameCompetitionBadge.vue'
const {liveGames,error,retry}=useDailyGames(),auth=useAuthStore(),titleId=useId()
const hideScores=computed(()=>auth.loading||auth.user?.hideScores!==false)
function periodLabel(game:Game){
  if(/half.?time/i.test(game.status))return 'Большой перерыв'
  if(!game.livePeriod)return game.status||'В игре'
  return game.livePeriod<=4?`Q${game.livePeriod}`:`ОТ${game.livePeriod-4}`
}
</script>
