<template>
  <div role="link" tabindex="0" class="cursor-pointer" @click="openGame(router, game)" @keydown.enter="openGame(router, game)">
    <div class="teams flex items-center justify-between mb-2">
      <div class="team team-visitor">
        <img :src="getTeamLogo(game.visitor_team.abbreviation)" class="team-logo" />
      </div>
      <span class="vs mx-2">VS</span>
      <div class="team team-home">
        <img :src="getTeamLogo(game.home_team.abbreviation)" class="team-logo" />
      </div>
    </div>

    <div v-if="isLiveGame(game)" class="mb-2 flex items-center justify-center gap-2 text-sm font-bold text-red-600">
      <span class="inline-flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-red-600 motion-safe:animate-pulse"></span>LIVE</span>
      <span class="text-gray-600 dark:text-slate-300">{{ game.status }}</span>
    </div>
    <div v-else-if="game.datetime" class="game-status mb-2">
      <span class="status-upcoming inline-flex items-center gap-1">
        <ClockIcon class="h-4 w-4" />
        {{ countdowns[game.id] || formatGameTime(game.datetime) }}
      </span>
    </div>

    <div class="match-start-time text-sm text-gray-500 dark:text-slate-400 inline-flex items-center gap-1">
      <BellAlertIcon class="h-4 w-4" />
      <span>{{ formatStart(game.datetime) }} МСК</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { openGame } from '../../../api/gameNavigation'

const router = useRouter()

import { isLiveGame } from '../../../composables/NBA/main_slider/useDailyGames'

const formatStart = (iso: string) => {
  if (!iso || Number.isNaN(Date.parse(iso))) return 'Время уточняется'
  return new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

import { ClockIcon, BellAlertIcon } from '@heroicons/vue/24/outline'
import type { Game } from '../../../composables/NBA/main_slider/useDailyGames.ts'
import { getTeamLogo } from '../../../utils/getTeamLogo'

const props = defineProps<{
  game: Game
  countdowns: Record<string, string>
  formatGameTime: (iso: string) => string
}>()
</script>