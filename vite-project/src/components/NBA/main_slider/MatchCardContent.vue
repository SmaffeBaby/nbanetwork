<template>
  <div role="link" tabindex="0" class="cursor-pointer" @click="openGame(router, String(game.id))" @keydown.enter="openGame(router, String(game.id))">
    <div class="teams flex items-center justify-between mb-2">
      <div class="team team-visitor">
        <img :src="getTeamLogo(game.visitor_team.abbreviation)" class="team-logo" />
      </div>
      <span class="vs mx-2">VS</span>
      <div class="team team-home">
        <img :src="getTeamLogo(game.home_team.abbreviation)" class="team-logo" />
      </div>
    </div>

    <div v-if="game.datetime" class="game-status mb-2">
      <span class="status-upcoming inline-flex items-center gap-1">
        <ClockIcon class="h-4 w-4" />
        {{ countdowns[game.id] || formatGameTime(game.datetime) }}
      </span>
    </div>

    <div class="match-start-time text-sm text-gray-500 dark:text-slate-400 inline-flex items-center gap-1">
      <BellAlertIcon class="h-4 w-4" />
      <span>Начало в {{ formatGameTime(game.datetime) }} МСК</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { openGame } from '../../../api/gameNavigation'

const router = useRouter()

import { ClockIcon, BellAlertIcon } from '@heroicons/vue/24/outline'
import type { Game } from '../../../composables/NBA/main_slider/useDailyGames.ts'
import { getTeamLogo } from '../../../utils/getTeamLogo'

const props = defineProps<{
  game: Game
  countdowns: Record<string, string>
  formatGameTime: (iso: string) => string
}>()
</script>