<template>
  <div>
    <div class="teams flex items-center justify-between mb-2">
      <div class="team team-visitor">
        <img :src="getTeamLogo(game.visitor_team.abbreviation)" class="team-logo" />
      </div>
      <span class="vs mx-2">VS</span>
      <div class="team team-home">
        <img :src="getTeamLogo(game.home_team.abbreviation)" class="team-logo" />
      </div>
    </div>

    <div v-if="game.period > 0 || game.status === 'Final'" class="scoreboard flex justify-between items-center mb-2">
      <div class="team team-visitor text-center">
        <span class="team-name">{{ game.visitor_team.abbreviation }}</span>
        <span class="team-score">{{ game.visitor_team_score }}</span>
      </div>

      <div class="game-info text-center">
        <span v-if="game.status !== 'Final'" class="period">
          Q{{ game.period }} <span class="live-indicator">🔴 LIVE</span>
        </span>
        <span v-else class="final">FINAL</span>
      </div>

      <div class="team team-home text-center">
        <span class="team-score">{{ game.home_team_score }}</span>
        <span class="team-name">{{ game.home_team.abbreviation }}</span>
      </div>
    </div>

    <div v-if="game.period === 0" class="game-status mb-2">
      <span class="status-upcoming">🕒 {{ countdowns[game.id] || formatGameTime(game.datetime) }}</span>
    </div>

    <div class="match-start-time text-sm text-gray-500">
      ⏰ Начало в: {{ formatGameTime(game.datetime) }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Game } from '../../../composables/NBA/main_slider/useDailyGames.ts'
import { getTeamLogo } from '../../../utils/getTeamLogo'

const props = defineProps<{
  game: Game
  countdowns: Record<string, string>
  formatGameTime: (iso: string) => string
}>()
</script>