<template>
  <article class="player-card relative cursor-pointer bg-white overflow-hidden rounded-2xl border text-left transition" @click="openFromCard" :class="selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'">
    <button type="button" :aria-label="`Открыть статистику: ${player.name}`" class="relative block w-full text-left h-40 overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100" @click.stop="detailsOpen = true">
      <span class="absolute left-3 top-3 z-10 rounded-lg bg-white/90 px-2 py-1 text-xs font-black text-slate-700">{{ position }}</span>
      <img :src="`/logos/${player.team}.svg`" :alt="player.team" class="absolute right-3 top-3 z-10 h-10 w-10 object-contain drop-shadow-sm" />
      <img v-if="!photoFailed" :src="`https://a.espncdn.com/i/headshots/nba/players/full/${player.id}.png`" :alt="player.name" class="absolute bottom-0 left-0 h-36 w-full object-contain object-bottom transition duration-300" loading="lazy" @error="photoFailed = true" />
      <span v-else class="absolute inset-0 flex items-center justify-center text-5xl font-black text-slate-300">{{ initials }}</span>

      <span v-if="selected" class="absolute bottom-2 right-3 rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white">✓ В составе</span>
    </button>
    <FantasyOvrBadge :rating="player" :name="player.name" class="absolute left-3 top-[116px] z-20" />
    <div class="space-y-2 p-4">
      <p class="text-xs font-bold uppercase tracking-wide text-slate-400">{{ player.team }}</p>
      <p v-if="popularity && popularity.total>0" class="text-[11px] font-semibold text-indigo-600">Выборов: {{ popularity.count }} · {{ points(popularity.count*100/popularity.total) }}% составов</p>
      <h3 class="text-base font-extrabold leading-5 text-slate-900"><button type="button" class="text-left hover:text-blue-600" @click.stop="detailsOpen = true">{{ player.name }}</button></h3>
      <p v-if="'injury' in player && player.injury" class="rounded-lg bg-rose-50 p-2 text-xs font-semibold text-rose-700">Травма / ограничение · {{ player.injury }}</p>
      <template v-if="'schedule' in player">
        <RouterLink v-if="nextMatch" :to="`/game/${nextMatch.id}`" class="block hover:text-blue-700 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
          <p class="font-bold text-slate-800">{{ nextMatch.matchup }}</p>
          <p class="mt-1">{{ dateTime(nextMatch.start) }} МСК</p>
        </RouterLink>
        <p v-else class="text-xs text-slate-500">Матчей в этот день нет</p>
        <details v-if="player.schedule.length > 1" class="text-xs text-slate-500">
          <summary class="cursor-pointer py-1 font-semibold">Все матчи дня</summary>
          <ul class="mt-1 space-y-2"><li v-for="game in player.schedule" :key="game.id"><RouterLink :to="`/game/${game.id}`" class="block rounded-lg p-1 hover:bg-blue-50 hover:text-blue-700"><strong>{{ game.matchup }} ↗</strong><br>{{ dateTime(game.start) }} МСК</RouterLink></li></ul>
        </details>
      </template>
      <FantasyPlayerLevel v-if="playerXp !== undefined" :xp="playerXp" />
      <p v-if="fantasyPoints !== undefined" class="text-lg font-black text-blue-600">{{ points(fantasyPoints) }} <span class="text-xs font-medium text-slate-400">фентези-очков</span></p>
      <button v-if="selectable" type="button" class="w-full rounded-xl px-3 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" :class="selected ? 'bg-blue-100 text-blue-700' : 'bg-slate-900 text-white hover:bg-blue-700'" :disabled="disabled" @click.stop="$emit('select')">{{ selected ? 'Выбран' : 'Выбрать игрока' }}</button>
    </div>
  </article>
  <FantasyPlayerDialog v-if="detailsOpen" :player="player" :position="position" :week="week" :mode="mode" :profile-id="profileId" :player-xp="playerXp" @close="detailsOpen = false" />
</template>
<script setup lang="ts">
import FantasyPlayerLevel from './FantasyPlayerLevel.vue'
import FantasyOvrBadge from './FantasyOvrBadge.vue'
import { computed, ref, watch, defineAsyncComponent } from 'vue'
const FantasyPlayerDialog = defineAsyncComponent(() => import('./FantasyPlayerDialog.vue'))
import { dateTime, points, type Player, type Pick } from './types'
const props = defineProps<{ player: Player | Pick; position: string; selected?: boolean; selectable?: boolean; disabled?: boolean; fantasyPoints?: number; week?: string; mode?: 'unlimited' | 'balanced' | 'legacy'; profileId?: string; playerXp?: number; popularity?: {count:number;total:number} }>()
defineEmits<{ select: [] }>()
const photoFailed = ref(false), detailsOpen = ref(false)
const nextMatch = computed(() => 'schedule' in props.player ? props.player.schedule.find(g => Date.parse(g.start) > Date.now()) || props.player.schedule.at(-1) : undefined)
function openFromCard(event: MouseEvent) {
  if ((event.target as HTMLElement).closest('button,a,details,summary')) return
  detailsOpen.value = true
}
watch(() => props.player.id, () => { photoFailed.value = false })
const initials = computed(() => props.player.name.split(' ').map(p => p[0]).slice(0, 2).join(''))
</script>
<style scoped>
.player-card { transition: border-color 180ms ease, box-shadow 180ms ease; }
</style>
