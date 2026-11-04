<template>
  <GameMatchesSlider
    :title="`Ближайшие матчи · ${team}`"
    :games="matches"
    :empty-text="loading ? 'Загружаем расписание…' : 'В расписании пока нет ближайших матчей.'"
    :error="error ?? undefined"
    @retry="retry"
  />
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useTeamUpcomingGames } from '../../../../composables/NBA/Teams/TeamsDetail/useTeamUpcomingGames'
import { TEAM_ID_MAP } from '../../../../constants/nbaTeams'
import { teamsFullNames } from '../../../../constants/TeamFullName'
import GameMatchesSlider from '../../GameFinal/GameMatchesSlider.vue'
import type { RelatedMatch } from '../../GameFinal/analysisTypes'

const props = defineProps<{ teamId: number; team: string }>()
const { games, loading, error, parseMatchup, retry } = useTeamUpcomingGames(toRef(props,'teamId'))
const teamInfo = (abbreviation: string) => ({
  id:TEAM_ID_MAP[abbreviation] || abbreviation,
  abbreviation,
  full_name:teamsFullNames[abbreviation] || abbreviation
})
const matches = computed<RelatedMatch[]>(() => games.value.flatMap(game => {
  if (!game.GAME_ID || !Number.isFinite(Date.parse(game.GAME_DATE)) || !/\s(?:@|vs\.)\s/.test(game.MATCHUP)) return []
  const {home,away} = parseMatchup(game.MATCHUP)
  return [{id:String(game.GAME_ID),datetime:game.GAME_DATE,status:'Scheduled',period:0,
    home_team:teamInfo(home),visitor_team:teamInfo(away),home_team_score:null,visitor_team_score:null}]
}).sort((a,b)=>Date.parse(a.datetime)-Date.parse(b.datetime)).slice(0,5))
</script>
